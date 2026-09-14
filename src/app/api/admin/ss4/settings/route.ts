/**
 * @file src/app/api/admin/ss4/settings/route.ts
 * @description Reads and updates the SS-4 automation config.
 *
 * The stored Fazita key is never returned — GET sends `hasVisionKey` and a
 * four-character hint so an administrator can tell which key is installed
 * without the secret crossing the wire.
 */

import { NextResponse } from 'next/server';
import {
  getSs4Settings,
  toPublicSettings,
  updateSs4Settings,
  type Ss4SettingsUpdate,
} from '@/lib/services/ss4/settings';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSs4Admin();
    const settings = await getSs4Settings();
    return NextResponse.json(toPublicSettings(settings), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Failed to read settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let admin;
  try {
    admin = await requireSs4Admin();
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  let body: Ss4SettingsUpdate;
  try {
    body = (await request.json()) as Ss4SettingsUpdate;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await updateSs4Settings(body, admin.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const settings = await getSs4Settings();
  return NextResponse.json(toPublicSettings(settings), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
