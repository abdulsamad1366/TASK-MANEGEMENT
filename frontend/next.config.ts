import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    let backendUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
      'http://localhost:5001';

    backendUrl = backendUrl.replace(/\/+$/, '');
    if (backendUrl.startsWith('http://') && !backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1')) {
      backendUrl = backendUrl.replace('http://', 'https://');
    }

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
