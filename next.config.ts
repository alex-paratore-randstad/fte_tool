
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  trailingSlash: true,
  generateBuildId: async () => {
    // Using a timestamp ensures a unique build ID for each deployment,
    // effectively busting any cache.
    return new Date().getTime().toString();
  },
  // This rewrite rule is a robust way to prevent the build from failing
  // due to a missing favicon. It tells Next.js to do nothing for that path.
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/_next/static/favicon.ico', // A path that doesn't exist but is handled by Next.js
      },
    ];
  },
};

export default nextConfig;
