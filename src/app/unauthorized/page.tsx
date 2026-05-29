import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Access Denied — Foremint",
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Status badge */}
        <span
          className="inline-block px-3 py-1 text-xs font-semibold text-[#34088f] bg-[#34088f]/8 rounded-[0.125rem] mb-6 tracking-wider uppercase"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          403 — Forbidden
        </span>

        <h1
          className="text-3xl font-bold text-black mb-3"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          Access Denied
        </h1>

        <p className="text-gray-500 text-sm mb-8 leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
          You don&apos;t have permission to view this page. If you believe this
          is an error, contact your administrator.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-[#34088f] text-white text-sm font-medium rounded-[0.125rem] hover:bg-[#2a0673] transition-colors"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="px-4 py-2 border border-gray-200 text-black text-sm font-medium rounded-[0.125rem] hover:bg-gray-50 transition-colors"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
