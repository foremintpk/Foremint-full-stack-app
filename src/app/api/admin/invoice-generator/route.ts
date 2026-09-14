/**
 * @file src/app/api/admin/invoice-generator/route.ts
 * @description Renders a client-facing invoice PDF.
 *
 * Ported from the standalone invoice app. Two changes on the way in:
 *   - gated to administrators and account managers, who invoice the clients
 *     whose LLC orders they work
 *   - the posted body is rebuilt field by field rather than trusted, since it
 *     now arrives from an authenticated session but is still browser input
 *
 * This is separate from /admin/invoices, which is the PKR bookkeeping ledger.
 * Different currency, different audience, different document.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildFileName, type CustomAddon, type InvoiceInput } from '@/lib/services/invoice/invoice';
import { renderInvoicePdf } from '@/lib/services/invoice/pdf';
import { requireInvoiceAccess, Ss4ForbiddenError } from '@/lib/services/ss4/guard';
import { saveInvoice } from '@/lib/services/invoice/store';

// pdf-lib + fontkit read the .ttf/.png assets from disk, so this must run on Node.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Coerces the posted JSON into a fully-populated InvoiceInput. */
function normalise(raw: Partial<InvoiceInput>): InvoiceInput {
  const num = (v: unknown, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const customAddons: CustomAddon[] = Array.isArray(raw.customAddons)
    ? raw.customAddons.map((a): CustomAddon => {
        const entry = (a ?? {}) as Partial<CustomAddon>;
        return {
          id: String(entry.id ?? ''),
          name: String(entry.name ?? '').trim(),
          description: String(entry.description ?? '').trim(),
          price: num(entry.price),
          bonus: Boolean(entry.bonus),
        };
      })
    : [];

  return {
    customerName: String(raw.customerName ?? '').trim(),
    invoiceDate: String(raw.invoiceDate ?? ''),
    invoiceNo: String(raw.invoiceNo ?? '').trim(),
    orderType: String(raw.orderType ?? 'llc'),
    stateCode: String(raw.stateCode ?? 'WY'),
    serviceType: String(raw.serviceType ?? ''),
    invoiceBy: String(raw.invoiceBy ?? ''),
    paymentStatus: String(raw.paymentStatus ?? 'unpaid'),
    packageId: String(raw.packageId ?? 'advanced'),
    packagePrice: num(raw.packagePrice),
    filingFee: num(raw.filingFee),
    addonIds: Array.isArray(raw.addonIds) ? raw.addonIds.map(String) : [],
    addonBonus: (raw.addonBonus ?? {}) as Record<string, boolean>,
    customAddons,
    discount: num(raw.discount),
    discountReason: String(raw.discountReason ?? ''),
    amountPaid: num(raw.amountPaid),
    paymentTermsTitle: String(raw.paymentTermsTitle ?? ''),
    paymentTermsBody: String(raw.paymentTermsBody ?? ''),
    itinTermsTitle: String(raw.itinTermsTitle ?? ''),
    itinTermsBody: String(raw.itinTermsBody ?? ''),
    includeCompliancePage: Boolean(raw.includeCompliancePage),
  };
}

export async function POST(request: NextRequest) {
  let admin;
  try {
    admin = await requireInvoiceAccess();
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  let body: Partial<InvoiceInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const input = normalise(body);

    if (!input.customerName) {
      return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 });
    }
    if (!input.invoiceNo) {
      return NextResponse.json({ error: 'Invoice number is required.' }, { status: 400 });
    }

    const pdf = await renderInvoicePdf(input);
    // An explicit name from the client wins, so a renamed invoice keeps its
    // name when regenerated.
    const fileName = (body as { fileName?: string }).fileName?.trim() || buildFileName(input);

    // Store the PDF and the form input. Deliberately not fatal: the document is
    // already rendered and on its way to the browser, so a storage hiccup must
    // not turn a good invoice into an error. The failure is surfaced in a
    // header instead.
    const stored = await saveInvoice({
      input,
      fileName,
      pdf,
      adminId: admin.id,
      existingId: (body as { invoiceId?: string }).invoiceId,
    });

    return new NextResponse(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        // RFC 5987 form so the customer name survives spaces and non-ASCII.
        'Content-Disposition':
          `attachment; filename="${fileName.replace(/["\\]/g, '')}"; ` +
          `filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'private, no-store',
        // The browser reads these to refresh the list and warn if the record
        // did not save.
        'X-Invoice-Saved': stored.saved ? '1' : '0',
        ...(stored.id ? { 'X-Invoice-Id': stored.id } : {}),
        ...(stored.error ? { 'X-Invoice-Error': stored.error.slice(0, 200) } : {}),
      },
    });
  } catch (error) {
    console.error('[invoice] generation failed', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Could not generate the PDF: ${message}` }, { status: 500 });
  }
}
