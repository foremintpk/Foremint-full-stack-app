"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Route } from "next";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleRedirect } from "@/lib/auth/get-session";

// ── Schemas ─────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email("Invalid email address").transform(val => val.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address").transform(val => val.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name is required"),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const ResetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ── Types ────────────────────────────────────────────────────────────────────

export type ActionResult =
  | { success: true; message: string }
  | { success: false; errorType?: "email" | "password" | "network" | "general"; error: string };

function getAuthError(error: unknown): ActionResult {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  ) {
    return {
      success: false,
      errorType: "email",
      error: "An account with this email already exists. Please sign in instead.",
    };
  }

  if (
    normalized.includes("fetch") ||
    normalized.includes("network") ||
    normalized.includes("connect") ||
    normalized.includes("connection") ||
    normalized.includes("timeout")
  ) {
    return {
      success: false,
      errorType: "network",
      error: "We could not reach the server. Please check your connection and try again.",
    };
  }

  if (
    normalized.includes("invalid login") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("password")
  ) {
    return {
      success: false,
      errorType: "password",
      error: "Incorrect password. Please try again.",
    };
  }

  return {
    success: false,
    errorType: "general",
    error: "Something went wrong. Please try again in a moment.",
  };
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function loginAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue.path[0];
    return {
      success: false,
      errorType: path === "email" ? "email" : "password",
      error: issue.message,
    };
  }

  const email = parsed.data.email;
  const password = parsed.data.password;

  // 1. Verify if email exists in public.profiles (to differentiate wrong email vs wrong password)
  try {
    const adminClient = createAdminClient();
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profileErr) {
      console.error("Database query failed during profile existence check:", profileErr);
    }

    if (!profile) {
      return {
        success: false,
        errorType: "email",
        error: "No account found with this email address.",
      };
    }
  } catch (err) {
    console.error("Profile check failed:", err);
  }

  // 2. Perform Supabase authentication
  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return getAuthError(error);
  }

  // Preemptively link onboarding draft to the logged-in user
  try {
    const cookieStore = await cookies();
    const tempSessionKey = cookieStore.get("foremint_temp_session_key")?.value || cookieStore.get("foremint_session_key")?.value;
    if (tempSessionKey && authData.user) {
      await supabase
        .from("onboarding_drafts")
        .update({ user_id: authData.user.id })
        .eq("temp_session_key", tempSessionKey);
    }
  } catch (linkErr) {
    console.error("Failed to link draft during login:", linkErr);
  }

  // Determine redirect based on role
  let redirectPath = "/dashboard";
  try {
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.role) {
      redirectPath = getRoleRedirect(profile.role);
    }
  } catch (err) {
    console.error("Unable to resolve role redirect after login:", err);
  }

  revalidatePath("/", "layout");
  redirect(redirectPath as Route);
}

export async function registerAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return getAuthError(error);
  }

  return {
    success: true,
    message: "Account created! Please check your email to verify your address.",
  };
}

export async function forgotPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get("email") };
  const parsed = ForgotPasswordSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: "Password reset link sent — check your email.",
  };
}

export async function resetPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = ResetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
