import { cache } from 'react';
import { createClient } from "@/lib/supabase/server";
import { time } from "@/lib/perf";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Route } from "next";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthSession = {
  user: User;
  profile: Profile;
};

export class AccountDisabledError extends Error {
  constructor() {
    super("ACCOUNT_DISABLED");
    this.name = "AccountDisabledError";
  }
}

/**
 * Returns the authenticated user + their profile row.
 * Throws if unauthenticated — use only behind protected routes.
 * Throws AccountDisabledError if the account has is_active = false.
 */
const getSessionImpl = async (): Promise<AuthSession> => {
  const supabase = await createClient();

  const {
    data: claimsData,
    error: userError,
  } = await time("getSession:auth.getClaims()", () => supabase.auth.getClaims());
  const claims = claimsData?.claims;
  // claims.sub is the user-id-equivalent claim (no `.id` field on JwtPayload) —
  // map it to `.id` so the returned `user` matches the existing `User`-shaped
  // AuthSession contract that ~20 downstream call sites rely on (`session.user.id`).
  const user = claims ? ({ ...claims, id: claims.sub } as unknown as User) : undefined;

  if (userError || !user) {
    throw new Error("Unauthenticated");
  }

  const { data: profile, error: profileError } = await time(
    "getSession:profile query",
    () =>
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
  );

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  if (profile.is_active !== true) {
    throw new AccountDisabledError();
  }

  return {
    user,
    profile: profile as Profile
  };
};

export const getSession = cache(getSessionImpl);

/**
 * Safe version — returns null instead of throwing.
 * Use in layouts/public components that need to check auth state.
 */
export async function getSessionSafe(): Promise<AuthSession | null> {
  try {
    return await getSession();
  } catch {
    return null;
  }
}

/**
 * Role-aware redirect path helper.
 */
export function getRoleRedirect(role: UserRole): Route {
  switch (role) {
    case "administrator":
    case "manager":
      return "/admin";
    case "customer":
    case "b2b_customer":
    default:
      return "/dashboard";
  }
}

/**
 * True when the role is a B2B customer — used to switch the customer dashboard
 * into read-only "B2B mode" (assigned LLCs only, limited sidebar).
 */
export function isB2BRole(role: UserRole | null | undefined): boolean {
  return role === "b2b_customer";
}
