/**
 * @file src/lib/services/ss4/template.ts
 * @description Builds the SS-4 base for one order: picks the right template,
 * stamps the attempt banner and sets the LLC member count.
 *
 * The banner is DRAWN, not edited. The original 4th-attempt template carried
 * its banner as text in a subset font holding only the glyphs of "4th Attempt
 * Please Give Attention" — no 2, 3, 5, d or r — so the wording could not be
 * rewritten. Drawing fresh text at the original's geometry reproduces it
 * exactly and works for any attempt number, which is why there is one base per
 * variant rather than one per attempt.
 *
 * Templates resolve in two steps: an administrator-uploaded row in
 * ss4_templates wins, and the bundled templates/ PDFs are the fallback so a
 * deployment works before anything has been uploaded.
 */

import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createAdminClient } from '@/lib/supabase/admin';

/** Banner geometry, measured from the original 4th-attempt template. */
const BANNER = { x: 37, y: 763, size: 30, grey: 0.12941 };
const SUFFIX = ' Attempt Please Give Attention';

/** Line 8b, "number of LLC members" — a text field that ships as "1". */
const MEMBER_COUNT_FIELD = 'topmostSubform[0].Page1[0].f1_12[0]';

export type TemplateVariant = 'single' | 'multi';

/** Bundled fallbacks, shipped in the repo under templates/. */
const BUNDLED: Record<TemplateVariant, string> = {
  single: 'ss4.pdf',
  multi: 'multiss4.pdf',
};

/** Process-lifetime cache. Templates are immutable once uploaded. */
const bundledCache = new Map<string, Uint8Array>();
const uploadedCache = new Map<string, Uint8Array>();

async function loadBundled(name: string): Promise<Uint8Array> {
  const hit = bundledCache.get(name);
  if (hit) return hit;

  const file = path.join(process.cwd(), 'templates', name);
  const bytes = new Uint8Array(await fs.readFile(file));
  bundledCache.set(name, bytes);
  return bytes;
}

async function loadUploaded(url: string): Promise<Uint8Array> {
  const hit = uploadedCache.get(url);
  if (hit) return hit;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not download the uploaded SS-4 template (HTTP ${response.status}). ` +
        'Check it under Admin → EIN → Templates, or deactivate it to fall back to the bundled form.'
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  uploadedCache.set(url, bytes);
  return bytes;
}

/**
 * The active base PDF for a variant: an uploaded template when one is marked
 * active, otherwise the bundled default.
 */
async function resolveBase(variant: TemplateVariant): Promise<Uint8Array> {
  const { data } = await createAdminClient()
    .from('ss4_templates')
    .select('document_url')
    .eq('variant', variant)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const url = (data as { document_url: string } | null)?.document_url;
  if (url) return loadUploaded(url);

  return loadBundled(BUNDLED[variant]);
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th". */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

/**
 * @param attempt 1 = first submission, drawn with no banner. 2+ stamps
 *                "2nd Attempt Please Give Attention" and so on. Capped at 6
 *                upstream, so the banner stops changing there.
 * @param members LLC member count; >1 switches to the Partnership base.
 */
export async function buildTemplate(attempt: number, members: number): Promise<Uint8Array> {
  const variant: TemplateVariant = members > 1 ? 'multi' : 'single';
  const doc = await PDFDocument.load(await resolveBase(variant));

  if (members > 1) {
    // An uploaded template may not carry the same AcroForm field names. Failing
    // the whole packet over the member count would be worse than filing the
    // Partnership base with its shipped default, so this is reported, not fatal.
    try {
      doc.getForm().getTextField(MEMBER_COUNT_FIELD).setText(String(members));
    } catch {
      console.warn(
        `[ss4] member-count field ${MEMBER_COUNT_FIELD} not found in the active multi-member template; left at its default.`
      );
    }
  }

  if (attempt > 1) {
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    doc.getPage(0).drawText(`${ordinal(attempt)}${SUFFIX}`, {
      x: BANNER.x,
      y: BANNER.y,
      size: BANNER.size,
      font,
      color: rgb(BANNER.grey, BANNER.grey, BANNER.grey),
    });
  }

  return await doc.save();
}

/** Clears the uploaded-template cache after an admin replaces one. */
export function invalidateTemplateCache(): void {
  uploadedCache.clear();
}
