import { NextRequest, NextResponse } from 'next/server';

// All document access is now handled by the centralized authenticated route.
// This admin endpoint redirects to it so any bookmarked or cached links continue to work.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> | { docId: string } }
) {
  const { docId } = await params;
  const isDownload = req.nextUrl.searchParams.get('download') === '1';

  const destination = new URL(`/api/documents/${docId}/view`, req.url);
  if (isDownload) destination.searchParams.set('download', '1');

  // 307 (temporary) so browsers do not cache this redirect and bypass auth checks
  return NextResponse.redirect(destination, { status: 307 });
}
