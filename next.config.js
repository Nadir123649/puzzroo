/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'enhance-wrinkle-disjoin.ngrok-free.dev',
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.ngrok.io',
  ],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: 'puzzroo-64f53.firebasestorage.app' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '*.ngrok-free.dev' },
      { protocol: 'https', hostname: '*.ngrok-free.app' },
      { protocol: 'https', hostname: '*.ngrok.io' },
    ],
  },
  reactStrictMode: true,
  serverExternalPackages: ['firebase-admin'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Allow OAuth popups to keep a window reference and avoid the
          // storage-partitioning that breaks Firebase's redirect state on
          // mobile (Vercel/Next apply Cross-Origin-Opener-Policy: same-origin).
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
