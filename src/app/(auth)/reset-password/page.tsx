import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { 
  title: "Reset Password — Foremint",
  description: "Create a new secure password for your Foremint account."
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2">
            <span
              className="text-2xl font-bold tracking-tight font-manrope"
              style={{ color: "#34088f" }}
            >
              Foremint
            </span>
          </a>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-[0.125rem] shadow-sm p-8">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
