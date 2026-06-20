/**
 * GET /api/public/blog-categories
 * Returns all active blog categories with published-post counts.
 */

import { NextResponse } from 'next/server';
import { getPublicCategories } from '@/lib/blog/publicCategories';
import { corsHeaders, corsPreflight } from '@/lib/blog/cors';

export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const categories = await getPublicCategories();
    return NextResponse.json(
      { categories },
      { headers: corsHeaders(request, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }) }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
  }
}
