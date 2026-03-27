
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
  webpack: (config) => {
    // Force strictly alphanumeric chunk and file names to avoid issues with special characters 
    // (e.g. [ or ]) in build artifacts, which can cause 500 errors in some environments.
    config.output.chunkFilename = 'static/chunks/[id]-[chunkhash].js';
    config.output.filename = 'static/chunks/[name]-[chunkhash].js';
    return config;
  },
};

export default nextConfig;
