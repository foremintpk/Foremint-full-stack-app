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

  // Allow LAN access from 192.168.100.5
  allowedDevOrigins: ["192.168.100.5"],
};

export default nextConfig;

