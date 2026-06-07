/**
 * @file src/app/(dashboard)/llc/[id]/page.tsx
 * @description LLC detail workspace — horizontal tab system with full context.
 */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession, isB2BRole } from '@/lib/auth/get-session';
import { getCachedLlcDetail, getCachedB2BLlcDetail } from '@/lib/dashboard/getLlcDetail';
import LlcDetailClient from './LlcDetailClient';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return {
    title: `LLC Details — Foremint`,
    description: `Manage your LLC registration, documents, and billing.`,
  };
}

export default async function LlcDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;

  let session;
  try {
    session = await getSession();
  } catch {
    redirect('/login');
  }

  const isB2B = isB2BRole(session.profile.role);
  const llc = isB2B
    ? await getCachedB2BLlcDetail(id)
    : await getCachedLlcDetail(id);
  if (!llc) notFound();

  return (
    <LlcDetailClient
      llc={llc}
      userId={session.user.id}
      activeTab={(tab as any) || 'overview'}
      readOnly={isB2B}
    />
  );
}
