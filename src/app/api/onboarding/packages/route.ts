import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 0; // Bypass Next.js route cache

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: packages, error } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mappedPackages = (packages || []).map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      price: Number(pkg.price),
      features: pkg.features || [],
      status: pkg.status,
      sortOrder: pkg.sort_order,
      createdAt: pkg.created_at,
      updatedAt: pkg.updated_at,
    }));

    return NextResponse.json({ packages: mappedPackages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
