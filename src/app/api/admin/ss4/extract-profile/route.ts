/**
 * @file src/app/api/admin/ss4/extract-profile/route.ts
 * @description Reads an order's documents and returns a reconciled company
 * profile (GET), or applies a reviewed profile to the company record (POST).
 *
 * Split deliberately: reading is safe and repeatable, writing to a client's
 * record is neither. The GET never mutates anything.
 */

import { NextResponse } from 'next/server';
import { buildCompanyProfile } from '@/lib/services/ss4/companyProfile.service';
import { applyCompanyProfile, type ProfileOverrides } from '@/lib/services/ss4/applyCompanyProfile';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';
import { revalidateOrder } from '@/lib/admin/actions/revalidateOrder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** A scanned Articles plus a scanned EIN letter is two vision reads. */
export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    await requireSs4Admin();
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const orderNumber = new URL(request.url).searchParams.get('orderNumber')?.trim();
  if (!orderNumber) {
    return NextResponse.json({ error: 'orderNumber is required' }, { status: 400 });
  }

  try {
    const profile = await buildCompanyProfile(orderNumber);
    return NextResponse.json(profile, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not read the documents.';
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

  let body: { orderNumber?: string; overrides?: ProfileOverrides };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orderNumber = body.orderNumber?.trim();
  if (!orderNumber) {
    return NextResponse.json({ error: 'orderNumber is required' }, { status: 400 });
  }

  try {
    // Rebuilt server-side rather than trusting a profile posted by the browser:
    // the client may only override individual fields, never invent the sources
    // or confidence a value claims to have.
    const profile = await buildCompanyProfile(orderNumber);
    const result = await applyCompanyProfile(profile, body.overrides ?? {}, admin.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    try {
      await revalidateOrder(profile.orderId);
    } catch {
      // A stale cache should not fail a successful write.
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not apply the profile.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
