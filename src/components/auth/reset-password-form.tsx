"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { resetPasswordAction, type ActionResult } from "@/actions/auth";

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    resetPasswordAction,
    null
  );

  useEffect(() => {
    if (state?.success === false) toast.error(state.error);
  }, [state]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
        Set new password
      </h1>
      <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: "Inter, sans-serif" }}>
        Choose a strong password for your account.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-black mb-1">
            New Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-[0.125rem] text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#34088f] transition-colors"
            placeholder="Min. 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-black mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-[0.125rem] text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#34088f] transition-colors"
            placeholder="Repeat your password"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-[#34088f] text-white text-sm font-medium rounded-[0.125rem] hover:bg-[#2a0673] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
