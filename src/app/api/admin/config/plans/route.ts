/**
 * @file src/app/api/admin/config/plans/route.ts
 * @description API route to fetch available LLC packages/plans.
 */

import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/getAdminUser';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Enforce administrative authentication
  const admin = await getAdminUser();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Predefined plans matching standard specifications
  const plans = [
    { id: 'standard', name: 'Standard Package', slug: 'standard', price: 120 },
    { id: 'advanced', name: 'Advanced Package', slug: 'advanced', price: 170 },
  ];

  return NextResponse.json(plans, {
    headers: {
      'Cache-Control': 'private, max-age=600',
    },
  });
}
