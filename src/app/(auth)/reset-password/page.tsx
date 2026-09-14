import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reset Password — Foremint",
  description: "Create a new secure password for your Foremint account.",
};

export default async function ResetPasswordPage() {
  // Reaching this page requires a session established by the recovery link
  // via /auth/callback. Without it the form could never succeed, so send the
  // user back to request a fresh link instead of showing a dead form.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/forgot-password?error=invalid_reset_link");
  }

  return <ResetPasswordForm />;
}
