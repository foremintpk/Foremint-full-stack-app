/**
 * @file src/app/(dashboard)/settings/page.tsx
 * @description Account settings — profile, password, email.
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect('/login');
  }

  return (
    <SettingsClient
      userId={session.user.id}
      fullName={session.profile.full_name || ''}
      email={session.profile.email || ''}
      phone={(session.profile as any).phone || ''}
    />
  );
}
