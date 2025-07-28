
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
  reactRoot: false,
};

export default nextConfig;
