/**
 * @file src/app/(dashboard)/support/page.tsx
 * @description Support tickets — list, create, and reply.
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { time } from '@/lib/perf';
import SupportClient from './SupportClient';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect('/login');
  }

  const supabase = await createClient();

  // Fetch user's support tickets with latest message preview.
  // NOTE: tickets and their messages are fetched in a SINGLE nested-select roundtrip
  // (query_messages embedded via the orders→queries→query_messages FK) — there is no
  // separate "message loader" query for this route. Labeled to reflect that for
  // accurate attribution (live message updates arrive via Realtime broadcast, not a
  // server-side fetch — see SupportClient's `ticket-${id}` channel).
  const { data: queriesRaw } = await time<any>('support:queries+messages query (single nested select)', () => supabase
    .from('queries')
    .select(`
      id,
      subject,
      status,
      created_at,
      updated_at,
      query_messages (
        id,
        content,
        sender_id,
        is_internal,
        created_at
      )
    `)
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false }));

  const queries = (queriesRaw || []).map((q: any) => ({
    id: q.id,
    subject: q.subject,
    status: q.status as 'open' | 'in_progress' | 'resolved' | 'closed',
    createdAt: q.created_at,
    updatedAt: q.updated_at,
    messageCount: q.query_messages?.length || 0,
    lastMessage: q.query_messages?.length
      ? [...q.query_messages].sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
      : null,
    messages: (q.query_messages || []).sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  }));

  return (
    <SupportClient
      userId={session.user.id}
      queries={queries}
    />
  );
}
