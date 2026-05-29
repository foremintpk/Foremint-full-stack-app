/**
 * @file src/app/api/admin/users/search/route.ts
 * @description API route to search for customers for order reassignment.
 * Strips sensitive PII and returns minimal profiles.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Enforce administrative authentication
  const admin = await getAdminUser();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  const supabase = await createClient();

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('role', 'customer');

  if (q.trim()) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: users, error } = await query.limit(10);

  if (error) {
    console.error('[User Search API Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map to clean PII-stripped camelCase objects
  const results = (users || []).map((user) => ({
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    avatarUrl: user.avatar_url,
  }));

  return NextResponse.json(results);
}
