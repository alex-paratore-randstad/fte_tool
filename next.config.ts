
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
  // Custom webpack config to handle Domo's restriction on special characters in filenames
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Sanitize chunk filenames to remove brackets used by Next.js for dynamic routes/turbopack
      // Domo Appstore does not allow [ ] in filenames
      config.output.filename = 'static/chunks/[name]-[contenthash].js';
      config.output.chunkFilename = 'static/chunks/[name]-[chunkhash].js';
      
      // Additional sanitization for the root and internal chunk names
      if (config.output.chunkFilename) {
        config.output.chunkFilename = (config.output.chunkFilename as string).replace(/\[|\]/g, '');
      }
      if (config.output.filename) {
        config.output.filename = (config.output.filename as string).replace(/\[|\]/g, '');
      }
    }
    return config;
  },
};

export default nextConfig;
