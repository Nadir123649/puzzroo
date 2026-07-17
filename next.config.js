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
    remotePatterns: [],
  },
  reactStrictMode: true,
}

module.exports = nextConfig
