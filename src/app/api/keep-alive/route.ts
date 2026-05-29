// TODO: Full implementation in Chunk 7B
// This endpoint is pinged every 3 days by Vercel Cron to prevent
// Supabase free-tier project pausing.

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // TODO: ping Supabase in 7B
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}
