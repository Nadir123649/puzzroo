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
    const production = process.env.NODE_ENV === 'production'

    return [
      {
        source: '/:path*',
        headers: [
          // NOTE: no Cross-Origin-Opener-Policy here. `same-origin-allow-popups`
          // only preserves the opener reference for SAME-origin popups; a
          // cross-origin Google popup still lands in a separate browsing
          // context group, which makes Chrome block window.closed/window.close
          // reads (console warnings) and degrades Firebase's popup channel.
          // With no COOP header at all, the popup shares the opener's group
          // and Firebase's popup flow works silently.
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // Advertise platform Client Hints on every response so browsers send
          // sec-ch-ua-platform(-version) — used for Windows 10 vs 11 detection.
          { key: 'Accept-CH', value: 'sec-ch-ua-platform-version, sec-ch-ua-platform' },

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
                  key: 'Referrer-Policy',
                  value: 'strict-origin-when-cross-origin',
                },
                {
                  key: 'Permissions-Policy',
                  value: 'geolocation=(), microphone=(), usb=()',
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
                    "connect-src 'self' https://res.cloudinary.com https://*.cloudinary.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebasestorage.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://api.stripe.com https://api64.ipify.org https://ipwho.is",
                    "font-src 'self' data:",
                    "form-action 'self'",
                    "frame-ancestors 'none'",
                    "frame-src 'self' https://accounts.google.com https://www.facebook.com https://connect.facebook.net https://*.stripe.com https://" + (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'puzzroo-64f53.firebaseapp.com'),
                    "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://puzzroo-64f53.firebasestorage.app https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://*.fbcdn.net",
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://connect.facebook.net https://*.stripe.com",
                    "style-src 'self' 'unsafe-inline'",
                    'upgrade-insecure-requests',
                    'report-uri /api/v1/system/csp-report',
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
