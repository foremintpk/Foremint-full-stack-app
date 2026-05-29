import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <h1
          className="text-5xl md:text-6xl font-bold text-black mb-6 tracking-tight"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          Your LLC, Managed with <span className="text-[#34088f]">Precision</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 leading-relaxed">
          The all-in-one platform for forming, managing, and scaling your business.
          Transparent pricing, expert support, and a seamless onboarding experience.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/onboarding"
            className="px-8 py-3 bg-[#34088f] text-white font-semibold rounded-[0.125rem] hover:bg-[#2a0673] transition-colors"
          >
            Start Formation
          </Link>
          <Link
            href="/services"
            className="px-8 py-3 border border-gray-200 text-black font-semibold rounded-[0.125rem] hover:bg-gray-50 transition-colors"
          >
            Explore Services
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          <div className="bg-white p-8 border border-gray-200 rounded-[0.125rem]">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Fast Formation
            </h3>
            <p className="text-gray-500 text-sm">
              Get your business up and running in days, not weeks. We handle the paperwork.
            </p>
          </div>
          <div className="bg-white p-8 border border-gray-200 rounded-[0.125rem]">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Secure Storage
            </h3>
            <p className="text-gray-500 text-sm">
              All your legal documents, EINs, and operating agreements in one secure dashboard.
            </p>
          </div>
          <div className="bg-white p-8 border border-gray-200 rounded-[0.125rem]">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "Manrope, sans-serif" }}>
              Expert Support
            </h3>
            <p className="text-gray-500 text-sm">
              Dedicated account managers to guide you through every step of your journey.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
