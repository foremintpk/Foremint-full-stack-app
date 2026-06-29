import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const startedAt = new Date().toISOString();

    // A tiny read is enough to keep the database connection path warm.
    // We use a head request so we do not move any data, only touch Supabase.
    const { error } = await supabase
      .from("blog_posts")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, timestamp: startedAt },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      timestamp: startedAt,
      pinged: "supabase:blog_posts",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
