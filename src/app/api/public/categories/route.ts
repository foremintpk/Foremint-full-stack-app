/**
 * GET /api/public/categories
 * Returns all blog categories. Public — no auth required.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminSdk = createAdminClient();
    const { data, error } = await (adminSdk as any)
      .from('blog_categories')
      .select('id, name, slug, description')
      .order('name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(
      { categories: data ?? [] },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
