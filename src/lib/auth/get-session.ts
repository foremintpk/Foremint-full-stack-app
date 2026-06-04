import { cache } from 'react';
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Route } from "next";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type AuthSession = {
  user: User;
  profile: Profile;
};

/**
 * Returns the authenticated user + their profile row.
 * Throws if unauthenticated — use only behind protected routes.
 */
const getSessionImpl = async (): Promise<AuthSession> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
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
    default:
      return "/dashboard";
  }
}
