import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foremint — LLC Client Onboarding & Management",
  description: "Simplify your LLC management with Foremint.",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation placeholder */}
      <nav className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span
            className="text-2xl font-bold tracking-tight text-[#34088f]"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Foremint
          </span>
          <div className="flex gap-4">
            <a href="/login" className="text-sm font-medium text-black hover:text-[#34088f]">
              Login
            </a>
            <a
              href="/register"
              className="text-sm font-medium bg-[#34088f] text-white px-4 py-2 rounded-[0.125rem]"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      {/* Footer placeholder */}
      <footer className="border-t border-gray-200 bg-gray-50 px-6 py-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Foremint LLC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
