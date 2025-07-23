import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
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
  },
  trailingSlash: true,
  generateBuildId: async () => {
    // This will be used as a static build ID
    return 'randstad-fte-build'
  },
};

export default nextConfig;
