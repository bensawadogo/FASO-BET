/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Gzip/Brotli compression
  compress: true,

  // Optimisation images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    unoptimized: false,
  },

  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/sdk"],
    optimizePackageImports: ['lucide-react'],
  },

  // Cache agressif des assets statiques (3G Burkina)
  async headers() {
    return [
      {
        source: '/logos/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ],
      },
    ];
  },
};

export default nextConfig;
