import type { Metadata } from "next";

export const metadata: Metadata = { 
  title: "Verify Email — Foremint",
  description: "Verify your email address to activate your Foremint account."
};

export default function VerifyEmailPage() {
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
        <div className="bg-white border border-gray-200 rounded-[0.125rem] shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-2 font-manrope">
            Check your email
          </h1>
          <p className="text-sm text-gray-500 font-inter">
            We have sent a verification link to your email address. Please click the link to verify your account and continue.
          </p>
        </div>
      </div>
    </div>
  );
}
