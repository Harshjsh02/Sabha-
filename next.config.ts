import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://sabha-955b3.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
