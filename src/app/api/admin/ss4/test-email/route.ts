/**
 * @file src/app/api/admin/ss4/test-email/route.ts
 * @description Sends the scheduled-run notification to the signed-in admin, so
 * the email can be checked without waiting for a real batch.
 *
 * `?preview=1` returns the rendered HTML instead of sending, which is the
 * quicker way to check wording and layout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendSs4BatchEmail } from '@/lib/email/sendSs4BatchEmail';
import { Ss4BatchCompleteHtml } from '@/lib/email/templates/ss4-batch-complete';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireSs4Admin();
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const params = request.nextUrl.searchParams;
  const withFailures = params.get('failures') === '1';

  const sample = {
    passed: withFailures ? 17 : 20,
    failures: withFailures
      ? [
          { orderNumber: 'FM-01151', reason: 'No Articles of Organization on file.' },
          { orderNumber: 'FM-01162', reason: 'The vision provider timed out reading this document.' },
          { orderNumber: 'FM-01177', reason: 'Cannot build this SS-4: the filing gave no mailing address.' },
        ]
      : [],
    batchId: 'preview-batch-0000',
  };

  if (params.get('preview') === '1') {
    const html = Ss4BatchCompleteHtml({
      passed: sample.passed,
      failures: sample.failures,
      finishedAt: 'preview — not a real run',
      batchUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/ein?batch=${sample.batchId}`,
    });
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
    });
  }

  const to = params.get('to') ?? undefined;
  const result = await sendSs4BatchEmail({ ...sample, to });
  return NextResponse.json(result);
}
