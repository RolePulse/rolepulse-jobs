import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.gstatic.com' },
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: '**.clearbit.com' },
    ],
    unoptimized: true,  // allows any external image URL without domain restrictions
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/jobs',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
