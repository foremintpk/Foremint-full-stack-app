import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getRoleRedirect } from "@/lib/auth/get-session";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  const error = searchParams.get("error");

  const resolveRedirectBase = () => {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    if (isLocalEnv || !forwardedHost) return origin;
    return `https://${forwardedHost}`;
  };

  const finish = async (fallback: string) => {
    let destination = fallback;

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role) {
          destination = getRoleRedirect(profile.role);
        }
      }
    } catch {
      destination = fallback;
    }

    // Recovery / onboarding must land on their own page, never a role dashboard.
    if (fallback === "/onboarding" || fallback === "/reset-password") {
      destination = fallback;
    }

    return NextResponse.redirect(`${resolveRedirectBase()}${destination}`);
  };

  // Email links (recovery, invite, email change, signup magic links) use a
  // one-time token_hash. This is stateless — no PKCE code_verifier cookie is
  // needed, so it works when the link is opened in a different browser/device
  // than the one that requested it.
  if (!error && tokenHash && type) {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!verifyError) {
      return finish(type === "recovery" ? "/reset-password" : next);
    }

    return NextResponse.redirect(
      `${resolveRedirectBase()}/login?error=auth_callback_failed`
    );
  }

  // OAuth / PKCE flows still exchange a code for a session.
  if (!error && code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return finish(next);
    }
  }

  return NextResponse.redirect(
    `${resolveRedirectBase()}/login?error=auth_callback_failed`
  );
}
