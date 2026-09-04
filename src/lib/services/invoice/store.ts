/**
 * @file src/lib/services/invoice/store.ts
 * @description Persists generated invoices: the PDF to Cloudinary, the record
 * to Postgres.
 *
 * An invoice is identified by its number, which is unique. Regenerating after
 * an edit REPLACES the stored PDF rather than adding a version — there is only
 * ever one current file per invoice number, which is how an invoice works.
 *
 * The full form input is stored alongside, so an invoice can be reopened in the
 * generator exactly as it was built rather than retyped.
 */

import 'server-only';
import { v2 as cloudinary } from 'cloudinary';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeTotals, type InvoiceInput } from './invoice';

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface StoredInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  orderType: string;
  stateCode: string;
  paymentStatus: string;
  invoiceBy: string | null;
  subTotal: number;
  discount: number;
  amountPaid: number;
  finalAmount: number;
  documentUrl: string | null;
  fileName: string;
  formInput: InvoiceInput;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  order_type: string;
  state_code: string;
  payment_status: string;
  invoice_by: string | null;
  sub_total: string | number;
  discount: string | number;
  amount_paid: string | number;
  final_amount: string | number;
  document_url: string | null;
  file_name: string;
  form_input: InvoiceInput;
  created_at: string;
  updated_at: string;
}

function fromRow(row: InvoiceRow): StoredInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name,
    invoiceDate: row.invoice_date,
    orderType: row.order_type,
    stateCode: row.state_code,
    paymentStatus: row.payment_status,
    invoiceBy: row.invoice_by,
    subTotal: Number(row.sub_total),
    discount: Number(row.discount),
    amountPaid: Number(row.amount_paid),
    finalAmount: Number(row.final_amount),
    documentUrl: row.document_url,
    fileName: row.file_name,
    formInput: row.form_input,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Strips characters Cloudinary or a filesystem would choke on. */
function sanitize(name: string): string {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120);
}

/** Uploads the rendered PDF, replacing whatever was there for this invoice. */
async function uploadPdf(
  bytes: Uint8Array,
  invoiceNumber: string,
  fileName: string
): Promise<{ url: string; publicId: string }> {
  // Keyed by invoice number so a regeneration overwrites in place; the trailing
  // .pdf keeps Cloudinary serving real PDF bytes for a raw resource.
  const publicId = `${sanitize(invoiceNumber)}-${sanitize(fileName)}.pdf`;

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'foremint/invoices',
            public_id: publicId,
            resource_type: 'raw',
            overwrite: true,
            invalidate: true,
          },
          (error, uploaded) => {
            if (error || !uploaded) {
              reject(error ?? new Error('Cloudinary returned no result for the invoice.'));
              return;
            }
            resolve(uploaded as { secure_url: string; public_id: string });
          }
        )
        .end(Buffer.from(bytes));
    }
  );

  return { url: result.secure_url, publicId: result.public_id };
}

export interface SaveInvoiceParams {
  input: InvoiceInput;
  fileName: string;
  pdf: Uint8Array;
  adminId: string;
  /** Set when regenerating an existing invoice rather than creating one. */
  existingId?: string;
}

/**
 * Stores a generated invoice. Creates or updates by invoice number, so a
 * regeneration keeps the same row and replaces the same file.
 *
 * Never throws: the PDF has already been produced and is being returned to the
 * browser, so a storage failure must not turn a good download into an error.
 */
export async function saveInvoice(
  params: SaveInvoiceParams
): Promise<{ saved: boolean; id?: string; error?: string }> {
  const { input, fileName, pdf, adminId, existingId } = params;
  const db = createAdminClient();

  let upload: { url: string; publicId: string };
  try {
    upload = await uploadPdf(pdf, input.invoiceNo, fileName);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.';
    console.error(`[invoice] could not store ${input.invoiceNo}: ${message}`);
    return { saved: false, error: message };
  }

  const totals = computeTotals(input);
  const row = {
    invoice_number: input.invoiceNo,
    customer_name: input.customerName,
    invoice_date: input.invoiceDate,
    order_type: input.orderType,
    state_code: input.stateCode,
    payment_status: input.paymentStatus,
    invoice_by: input.invoiceBy || null,
    sub_total: totals.subTotal,
    discount: totals.discount,
    amount_paid: totals.payment,
    final_amount: totals.finalAmount,
    document_url: upload.url,
    document_public_id: upload.publicId,
    file_name: fileName,
    form_input: input,
    created_by: adminId,
  };

  // Upsert on the invoice number: regenerating the same invoice updates its row
  // rather than failing on the unique constraint or creating a duplicate.
  const { data, error } = existingId
    ? await db.from('generated_invoices').update(row as never).eq('id', existingId).select('id').single()
    : await db
        .from('generated_invoices')
        .upsert(row as never, { onConflict: 'invoice_number' })
        .select('id')
        .single();

  if (error) {
    console.error(`[invoice] could not record ${input.invoiceNo}: ${error.message}`);
    return { saved: false, error: error.message };
  }

  return { saved: true, id: (data as { id: string }).id };
}

export interface ListInvoicesFilters {
  q?: string;
  orderType?: string;
  limit?: number;
}

/** The stored invoices, newest first. */
export async function listInvoices(
  filters: ListInvoicesFilters = {}
): Promise<StoredInvoice[]> {
  let query = createAdminClient()
    .from('generated_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.orderType && filters.orderType !== 'all') {
    query = query.eq('order_type', filters.orderType);
  }
  if (filters.q?.trim()) {
    const term = filters.q.replace(/[%,]/g, '').trim();
    if (term) {
      query = query.or(`invoice_number.ilike.%${term}%,customer_name.ilike.%${term}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not read invoices: ${error.message}`);
  return ((data ?? []) as unknown as InvoiceRow[]).map(fromRow);
}

/** One invoice, for reopening it in the generator. */
export async function getInvoice(id: string): Promise<StoredInvoice | null> {
  const { data, error } = await createAdminClient()
    .from('generated_invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Could not read the invoice: ${error.message}`);
  return data ? fromRow(data as unknown as InvoiceRow) : null;
}

/** Renames the stored file. The PDF itself is unchanged. */
export async function renameInvoice(
  id: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = fileName.trim();
  if (!trimmed) return { success: false, error: 'The file name cannot be empty.' };
  if (trimmed.length > 200) return { success: false, error: 'That file name is too long.' };

  const withExtension = /\.pdf$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`;

  const { error } = await createAdminClient()
    .from('generated_invoices')
    .update({ file_name: withExtension } as never)
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export interface DeleteResult {
  deleted: number;
  /** Files that could not be removed from storage; the rows still went. */
  storageFailures: string[];
  error?: string;
}

/**
 * Deletes one or many invoices, removing the stored PDFs too.
 *
 * Storage first: a row deleted while its file survives leaves an orphan nobody
 * can find, so a storage failure is reported rather than swallowed — but it
 * does not block the deletion the operator asked for.
 */
export async function deleteInvoices(ids: string[]): Promise<DeleteResult> {
  if (ids.length === 0) return { deleted: 0, storageFailures: [] };

  const db = createAdminClient();
  const { data, error } = await db
    .from('generated_invoices')
    .select('id, invoice_number, document_public_id')
    .in('id', ids);

  if (error) return { deleted: 0, storageFailures: [], error: error.message };

  const rows = (data ?? []) as unknown as {
    id: string;
    invoice_number: string;
    document_public_id: string | null;
  }[];
  if (rows.length === 0) {
    return { deleted: 0, storageFailures: [], error: 'Those invoices no longer exist.' };
  }

  const storageFailures: string[] = [];
  await Promise.all(
    rows.map(async (r) => {
      if (!r.document_public_id) return;
      try {
        await cloudinary.uploader.destroy(r.document_public_id, { resource_type: 'raw' });
      } catch {
        storageFailures.push(r.invoice_number);
      }
    })
  );

  const { error: deleteError } = await db
    .from('generated_invoices')
    .delete()
    .in('id', rows.map((r) => r.id));

  if (deleteError) return { deleted: 0, storageFailures, error: deleteError.message };
  return { deleted: rows.length, storageFailures };
}
