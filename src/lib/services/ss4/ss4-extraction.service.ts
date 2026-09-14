/**
 * @file src/lib/services/ss4/ss4-extraction.service.ts
 * @description The SS-4 pipeline's entry point: read an order's documents,
 * extract the payload, build the packet, store it, and record the outcome.
 *
 * This is the reusable background service. Every caller — the manual batch, the
 * scheduled cron, a single regeneration — goes through `generateForOrder`, so
 * the attempt ladder, the extraction cache and the audit trail behave
 * identically no matter what triggered the run.
 *
 * ORDER OF OPERATIONS matters here and is deliberate:
 *   1. Extract from the Articles first. A filing that cannot be read must fail
 *      the order BEFORE the ladder advances, or a wasted attempt is burned on a
 *      document that never produced a packet.
 *   2. Verify the responsible party. Advisory only — a failed check never loses
 *      the packet, it just annotates it.
 *   3. Advance the ladder and build. The attempt number comes back from the
 *      database, saturating at 6.
 *   4. Upload, then record. A record with no document_url is worse than a
 *      failed row, so the upload has to succeed first.
 */

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyAddressOverride, extractArticles, type Extraction } from './extract';
import { verifyName, type NameVerification } from './verify';
import { buildPacket } from './packet';
import {
  getCachedExtraction,
  getCachedName,
  putCachedExtraction,
  putCachedName,
  recordAttempt,
} from './state';
import { uploadSs4Packet } from './storage';
import { applyCompanyRecord, getCompanyRecord } from './companyOverride';
import type { Ss4GenerationResult, Ss4OrderRow, Ss4TriggerSource } from './types';

export interface GenerateOptions {
  order: Ss4OrderRow;
  /** Appended to the standing rules for this run only. */
  instructions?: string;
  /** Exact name for line 7a, from the corrections box. Wins over everything. */
  nameOverride?: string;
  batchId: string;
  trigger: Ss4TriggerSource;
  /** Administrator who started the run; null for scheduled runs. */
  adminId: string | null;
}

/** A failure that should be recorded against the order rather than thrown away. */
function toFailure(
  order: Ss4OrderRow,
  reason: string,
  attempt: number
): Ss4GenerationResult {
  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    status: 'failed',
    companyName: order.llcName || null,
    addressUsed: null,
    memberCount: order.members,
    attempt,
    documentUrl: null,
    failureReason: reason,
    pages: null,
    articlesPages: null,
  };
}

/** Writes the outcome of one order into ss4_documents. */
async function persist(
  result: Ss4GenerationResult,
  context: {
    batchId: string;
    trigger: Ss4TriggerSource;
    adminId: string | null;
    extraction: Extraction | null;
    verification: NameVerification | null;
    publicId: string | null;
  }
): Promise<void> {
  const { error } = await createAdminClient().from('ss4_documents').insert({
    order_id: result.orderId,
    order_number: result.orderNumber,
    status: result.status,
    failure_reason: result.failureReason,
    company_name: result.companyName,
    address_used: result.addressUsed,
    member_count: result.memberCount,
    attempt_count: result.attempt,
    document_url: result.documentUrl,
    document_public_id: context.publicId,
    page_count: result.pages,
    articles_pages: result.articlesPages,
    extraction: context.extraction,
    verification: context.verification,
    batch_id: context.batchId,
    trigger_source: context.trigger,
    generated_by: context.adminId,
  } as never);

  // A record write failing must not crash the batch — the packet already exists
  // in Cloudinary, and losing the remaining orders over one bad insert is worse.
  if (error) {
    console.error(
      `[ss4] could not record ${result.orderNumber} (${result.status}): ${error.message}`
    );
  }
}

/** Flattens an extraction into the one-line address shown in the records table. */
function formatAddress(x: Extraction): string {
  return [x.mailingAddress, x.city, x.state, x.zip].filter(Boolean).join(', ');
}

/**
 * Generates one SS-4 packet end to end.
 *
 * Never throws: every failure path returns a `failed` result and records it, so
 * a single unreadable filing cannot take down a batch of twenty.
 */
export async function generateForOrder(
  options: GenerateOptions
): Promise<Ss4GenerationResult> {
  const { order, batchId, trigger, adminId } = options;
  const instructions = options.instructions ?? '';

  if (!order.orderNumber) {
    return toFailure(order, 'This order has no order number, so its attempt ladder cannot be tracked.', 0);
  }

  if (!order.articlesUrl) {
    const failure = toFailure(
      order,
      'No Articles of Organization on file. Upload the filing on the order before generating.',
      order.nextAttempt
    );
    await persist(failure, {
      batchId, trigger, adminId, extraction: null, verification: null, publicId: null,
    });
    return failure;
  }

  // --- 1. Articles: legal name, formation date, mailing address ---------------
  // Read before the ladder advances, so an unreadable filing never burns an
  // attempt.
  let extraction: Extraction;
  let wasCached = false;
  try {
    const cached = await getCachedExtraction(order.articlesUrl);
    if (cached) {
      extraction = { ...cached, source: 'cache' };
      wasCached = true;
    } else {
      extraction = await extractArticles(order.articlesUrl, instructions);
    }
  } catch (error) {
    const failure = toFailure(
      order,
      error instanceof Error ? error.message : 'Could not read the Articles of Organization.',
      order.nextAttempt
    );
    await persist(failure, {
      batchId, trigger, adminId, extraction: null, verification: null, publicId: null,
    });
    return failure;
  }

  // A filing that carries no address at all can still be completed from the
  // instructions box rather than blocking the whole run.
  const withInstructions = applyAddressOverride(extraction, order.orderNumber, instructions);

  // The verified company record wins over a raw Articles read where it has a
  // value: it has been cross-checked against the EIN letter and may carry an
  // administrator's correction (FM-01090's Articles are an amendment, so the
  // filed date and ID there are not the original filing's).
  let resolved = withInstructions;
  let recordOverrides: string[] = [];
  let membersFromRecord: number | null = null;
  try {
    const record = await getCompanyRecord(order.orderId);
    const applied = applyCompanyRecord(withInstructions, record);
    resolved = applied.extraction;
    recordOverrides = applied.overridden;
    membersFromRecord = applied.memberCountFromRecord;
  } catch (error) {
    // The company record is an enhancement, not a requirement — a failure here
    // must not stop a packet the Articles alone could produce.
    console.warn(
      `[ss4] could not read the company record for ${order.orderNumber}: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
  }

  // --- 2. Responsible party -------------------------------------------------
  // Advisory. A failed check annotates the packet; it never blocks it.
  let verification: NameVerification;
  try {
    if (order.identityUrl) {
      const cachedName = await getCachedName(order.identityUrl);
      if (cachedName) {
        verification = { ...cachedName, source: 'cache' };
      } else {
        verification = await verifyName(order.responsibleName, order.identityUrl);
        await putCachedName(order.identityUrl, verification);
      }
    } else {
      verification = await verifyName(order.responsibleName, null);
    }
  } catch (error) {
    verification = {
      idName: null,
      source: 'order-form',
      status: 'unverified',
      note: `Name check could not run: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    };
  }

  // An ambiguous read is never auto-applied. Silently rewriting the responsible
  // party on a filed federal form is worse than flagging it, so the order-form
  // name stands unless a human overrode it.
  const override = options.nameOverride?.trim();
  const nameUsed = override || order.responsibleName;

  // --- 3. Advance the ladder and build --------------------------------------
  // The database decides the number and saturates at 6, so concurrent runs
  // cannot both claim the same attempt.
  let attempt: number;
  try {
    attempt = await recordAttempt(order.orderNumber, resolved.companyName || order.llcName);
  } catch (error) {
    const failure = toFailure(
      order,
      error instanceof Error ? error.message : 'Could not advance the attempt ladder.',
      order.nextAttempt
    );
    await persist(failure, {
      batchId, trigger, adminId, extraction: resolved, verification, publicId: null,
    });
    return failure;
  }

  try {
    // The order form's member list is the primary count; the company record's
    // structure only fills in when the form recorded none.
    const members = Math.max(1, order.members || membersFromRecord || 1);

    const packet = await buildPacket({
      orderNumber: order.orderNumber,
      responsibleName: nameUsed,
      members,
      attempt,
      extraction: resolved,
      articlesUrl: order.articlesUrl,
    });

    // --- 4. Store, then record ----------------------------------------------
    const uploaded = await uploadSs4Packet(packet.bytes, {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      companyName: resolved.companyName,
      attempt,
    });

    // Only cache a complete read. Caching a partial one means every later run
    // reuses the gap instead of re-reading the document.
    if (!wasCached && !resolved.warning) {
      await putCachedExtraction(order.articlesUrl, extraction);
    }

    const result: Ss4GenerationResult = {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: 'passed',
      companyName: resolved.companyName,
      addressUsed: formatAddress(resolved),
      memberCount: members,
      attempt,
      documentUrl: uploaded.url,
      failureReason: null,
      pages: packet.pages,
      articlesPages: packet.articlesPages,
    };

    await persist(result, {
      batchId, trigger, adminId,
      // Note which values came from the verified company record rather than the
      // filing, so the records table can explain the difference later.
      extraction: recordOverrides.length
        ? ({
            ...resolved,
            warning: [
              resolved.warning,
              'From the verified company record: ' + recordOverrides.join(', ') + '.',
            ]
              .filter(Boolean)
              .join(' '),
          } as Extraction)
        : resolved,
      verification,
      publicId: uploaded.publicId,
    });
    return result;
  } catch (error) {
    // The ladder has already advanced at this point. That is intentional: the
    // attempt was genuinely consumed, and silently rolling it back would let a
    // repeatedly failing order re-send the same banner forever.
    const failure = toFailure(
      order,
      error instanceof Error ? error.message : 'Could not build the SS-4 packet.',
      attempt
    );
    await persist(failure, {
      batchId, trigger, adminId, extraction: resolved, verification, publicId: null,
    });
    return failure;
  }
}
