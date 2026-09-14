/**
 * @file src/app/api/admin/invoices-generated/route.ts
 * @description The stored client invoices: list, rename, delete.
 *
 * Named to stay clear of /api/admin/invoices, which belongs to the internal
 * PKR bookkeeping ledger.
 */

import { NextResponse } from 'next/server';
import {
  deleteInvoices,
  getInvoice,
  listInvoices,
  renameInvoice,
  type StoredInvoice,
} from '@/lib/services/invoice/store';
import { requireInvoiceAccess, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ids go straight into a Postgres uuid column; a malformed one would surface as
// a driver error rather than a clean 400.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Drops the Cloudinary URL before the invoice goes to the browser.
 *
 * An invoice carries a client's name and what they were charged, and a
 * Cloudinary URL needs no session to fetch. The browser only needs to know
 * whether a file exists — it reads the PDF through the authenticated view
 * route, so `hasDocument` replaces the URL entirely.
 */
function forClient(invoice: StoredInvoice) {
  const { documentUrl, ...rest } = invoice;
  return { ...rest, hasDocument: Boolean(documentUrl) };
}

export async function GET(request: Request) {
  try {
    await requireInvoiceAccess();

    const params = new URL(request.url).searchParams;

    // A single invoice, for reopening it in the generator.
    const id = params.get('id');
    if (id) {
      if (!UUID.test(id)) {
        return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
      }
      const invoice = await getInvoice(id);
      if (!invoice) {
        return NextResponse.json({ error: 'That invoice no longer exists.' }, { status: 404 });
      }
      return NextResponse.json({ invoice: forClient(invoice) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const invoices = await listInvoices({
      q: params.get('q') ?? undefined,
      orderType: params.get('orderType') ?? undefined,
    });
    return NextResponse.json({ invoices: invoices.map(forClient) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Could not read invoices.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Renames the stored file. The PDF itself is untouched. */
export async function PATCH(request: Request) {
  try {
    await requireInvoiceAccess();

    const { id, fileName } = (await request.json()) as { id?: string; fileName?: string };
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (!UUID.test(id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }
    if (typeof fileName !== 'string') {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    const result = await renameInvoice(id, fileName);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Rename failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Deletes one invoice (`?id=`) or several (`{ ids: [...] }`). */
export async function DELETE(request: Request) {
  try {
    await requireInvoiceAccess();

    const single = new URL(request.url).searchParams.get('id');
    let ids: string[] = single ? [single] : [];

    if (!single) {
      const body = await request.json().catch(() => ({}));
      ids = Array.isArray((body as { ids?: unknown }).ids)
        ? ((body as { ids: unknown[] }).ids.filter((v) => typeof v === 'string') as string[])
        : [];
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Provide id or ids.' }, { status: 400 });
    }
    if (ids.some((value) => !UUID.test(value))) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }
    // A bulk delete is unbounded otherwise; the list caps at 200.
    if (ids.length > 200) {
      return NextResponse.json(
        { error: 'Too many invoices in one request — delete up to 200 at a time.' },
        { status: 400 }
      );
    }

    const result = await deleteInvoices(ids);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      warning: result.storageFailures.length
        ? `${result.storageFailures.length} file(s) could not be removed from storage: ${result.storageFailures.join(', ')}.`
        : undefined,
    });
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Delete failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
