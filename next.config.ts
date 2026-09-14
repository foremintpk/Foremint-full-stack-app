import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },

  // In Next.js 15+, typedRoutes has moved from experimental to the root config
  typedRoutes: true,

  // The SS-4 pipeline runs native/Node-only PDF code in route handlers; bundling
  // these breaks mupdf's WASM loading and pdf-lib's font handling.
  serverExternalPackages: ["mupdf", "pdf-lib", "@pdf-lib/fontkit"],

  // Those routes read the SS-4 base templates and the signature font from disk
  // at request time, so the files must ship with the serverless function.
  outputFileTracingIncludes: {
    "/api/admin/ss4/**": ["./templates/**", "./public/fonts/**"],
    "/api/cron/ss4-scheduled/**": ["./templates/**", "./public/fonts/**"],
    // The invoice renderer embeds the Poppins faces and the logo, read from
    // disk at request time.
    "/api/admin/invoice-generator/**": ["./public/fonts/**", "./public/brand/**"],
  },

  // Allow LAN access from 192.168.100.5
  allowedDevOrigins: ["192.168.100.5"],
};

export default nextConfig;

