import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'jcdlamesckdgrgatwrhb.supabase.co',
        port: '',
        pathname: '/storage/**',
      },
    ],
    dangerouslyAllowSVG: true,
  },
  eslint: {
    // Allow builds to succeed even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow builds to succeed even with TypeScript errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
