"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { forgotPasswordAction, type ActionResult } from "@/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    forgotPasswordAction,
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.error);
  }, [state]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
        Forgot password?
      </h1>
      <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: "Inter, sans-serif" }}>
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-black mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-[0.125rem] text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#34088f] transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-[#34088f] text-white text-sm font-medium rounded-[0.125rem] hover:bg-[#2a0673] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/onboarding" className="text-[#34088f] font-medium hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
