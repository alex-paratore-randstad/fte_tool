
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  /* config options here */
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Force strictly alphanumeric chunk names to avoid issues with special characters (e.g. [ or ]) in build artifacts.
      // This uses chunk hashes which are guaranteed to be alphanumeric strings.
      config.output.chunkFilename = 'static/chunks/[id]-[chunkhash].js';
    }
    return config;
  },
};

export default nextConfig;
