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
}

module.exports = nextConfig
