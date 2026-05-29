import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { 
  title: "Forgot Password — Foremint",
  description: "Reset your Foremint account password securely."
};

export default function ForgotPasswordPage() {
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
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
