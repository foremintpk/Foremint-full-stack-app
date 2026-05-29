/**
 * @file src/app/api/admin/config/addons/route.ts
 * @description API route to fetch active and available addons dynamically from registry.
 */

import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { ADDON_REGISTRY } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Enforce administrative authentication
  const admin = await getAdminUser();
  if (!admin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Format addons dynamically from registry
  const addons = Object.values(ADDON_REGISTRY).map((addon) => ({
    id: addon.id,
    name: addon.title,
    price: addon.price,
  }));

  return NextResponse.json(addons, {
    headers: {
      'Cache-Control': 'private, max-age=600',
    },
  });
}
