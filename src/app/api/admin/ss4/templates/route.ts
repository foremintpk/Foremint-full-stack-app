/**
 * @file src/app/api/admin/ss4/templates/route.ts
 * @description Sample SS-4 template library: list, upload, activate, delete.
 *
 * An uploaded template overrides the bundled base for its variant. The banner
 * is drawn at fixed geometry measured from the original form, so a template
 * with a different layout will place it wrongly — uploads are validated as
 * fillable PDFs, and the active one can always be deactivated to fall back.
 */

import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';
import { deleteSs4Asset, uploadSs4Template } from '@/lib/services/ss4/storage';
import { invalidateTemplateCache } from '@/lib/services/ss4/template';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET() {
  try {
    await requireSs4Admin();

    const { data, error } = await createAdminClient()
      .from('ss4_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json(
      { templates: data ?? [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Failed to read templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireSs4Admin();
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  try {
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const name = String(form.get('name') ?? '').trim();
    const variant = String(form.get('variant') ?? 'single');

    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    if (!['single', 'multi'].includes(variant)) {
      return NextResponse.json({ error: 'variant must be "single" or "multi".' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Template too large (max 25 MB).' }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // A template with no AcroForm cannot be filled, and would otherwise fail
    // silently at generation time on every order in the book.
    try {
      const probe = await PDFDocument.load(bytes);
      if (probe.getForm().getFields().length === 0) {
        return NextResponse.json(
          { error: 'That PDF has no form fields, so it cannot be filled. Upload the fillable IRS SS-4.' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: 'That file is not a readable PDF.' }, { status: 400 });
    }

    const uploaded = await uploadSs4Template(bytes, name || file.name);

    const { data, error } = await createAdminClient()
      .from('ss4_templates')
      .insert({
        name: name || file.name,
        variant,
        document_url: uploaded.url,
        public_id: uploaded.publicId,
        file_name: file.name,
        file_size: file.size,
        is_active: false,
        uploaded_by: admin.id,
      } as never)
      .select()
      .single();

    if (error) throw new Error(error.message);

    invalidateTemplateCache();
    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSs4Admin();

    const { id, isActive } = (await request.json()) as { id?: string; isActive?: boolean };
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const db = createAdminClient();

    const { data: target, error: readErr } = await db
      .from('ss4_templates')
      .select('variant')
      .eq('id', id)
      .maybeSingle();

    if (readErr || !target) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 });
    }

    // Only one template per variant may be active, or resolveBase would pick
    // arbitrarily between them.
    if (isActive) {
      await db
        .from('ss4_templates')
        .update({ is_active: false } as never)
        .eq('variant', (target as { variant: string }).variant);
    }

    const { error } = await db
      .from('ss4_templates')
      .update({ is_active: Boolean(isActive) } as never)
      .eq('id', id);

    if (error) throw new Error(error.message);

    invalidateTemplateCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireSs4Admin();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const db = createAdminClient();
    const { data: row } = await db
      .from('ss4_templates')
      .select('public_id')
      .eq('id', id)
      .maybeSingle();

    const { error } = await db.from('ss4_templates').delete().eq('id', id);
    if (error) throw new Error(error.message);

    // Best-effort: an orphaned Cloudinary file is preferable to a dangling row
    // that the generator would keep trying to download.
    const publicId = (row as { public_id: string | null } | null)?.public_id;
    if (publicId) {
      try {
        await deleteSs4Asset(publicId);
      } catch {
        console.warn(`[ss4] template row ${id} deleted but its Cloudinary file remains.`);
      }
    }

    invalidateTemplateCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
