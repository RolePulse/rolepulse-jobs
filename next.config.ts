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
  // Removed root redirect — / now serves the brand homepage (page.tsx)
  async redirects() {
    return [
      {
        source: '/profile',
        destination: '/account/profile',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
