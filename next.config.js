/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable automatic prefetching to prevent unnecessary API calls
  // prefetchesDisabled removed — invalid/removed experimental key in Next.js 16
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
    const production = process.env.NODE_ENV === 'production'

    return [
      {
        source: '/:path*',
        headers: [
          // Allow OAuth popups to keep a window reference and avoid the
          // storage-partitioning that breaks Firebase's redirect state on
          // mobile (Vercel/Next apply Cross-Origin-Opener-Policy: same-origin).
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },

          // ── production-only security headers ──
          ...(production
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
                {
                  key: 'X-Frame-Options',
                  value: 'DENY',
                },
                {
                  key: 'X-Content-Type-Options',
                  value: 'nosniff',
                },
                {
                  key: 'Referrer-Policy',
                  value: 'strict-origin-when-cross-origin',
                },
                {
                  key: 'Permissions-Policy',
                  value:
                    'camera=(), display-capture=(), geolocation=(), microphone=(), usb=()',
                },
                {
                  key: 'Cross-Origin-Resource-Policy',
                  value: 'same-origin',
                },
                {
                  key: 'Content-Security-Policy',
                  value: [
                    "default-src 'self'",
                    "base-uri 'self'",
                    "connect-src 'self' https://res.cloudinary.com https://*.cloudinary.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebasestorage.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://api.stripe.com",
                    "font-src 'self' data:",
                    "form-action 'self'",
                    "frame-ancestors 'none'",
                    "frame-src 'self' https://accounts.google.com https://www.facebook.com https://connect.facebook.net https://*.stripe.com",
                    "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://puzzroo-64f53.firebasestorage.app https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://*.fbcdn.net",
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://connect.facebook.net https://*.stripe.com",
                    "style-src 'self' 'unsafe-inline'",
                    'upgrade-insecure-requests',
                  ].join('; '),
                },
              ]
            : []),
        ],
      },
      {
        source: '/:path*(svg|png|ico|woff2|json|jpg|jpeg|gif|webp|ttf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
