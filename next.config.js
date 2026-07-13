const fs = require('fs');
const path = require('path');

// Auto-cleanup old root routes to prevent duplicate route conflicts with the new (dashboard) group
const oldPaths = [
  path.join(__dirname, 'src/app/account-information'),
  path.join(__dirname, 'src/app/billing-history'),
  path.join(__dirname, 'src/app/email-preferences'),
  path.join(__dirname, 'src/app/subscription'),
];

oldPaths.forEach((p) => {
  if (fs.existsSync(p)) {
    try {
      fs.rmSync(p, { recursive: true, force: true });
      console.log(`[Puzzroo Setup] Cleaned up old duplicate route: ${p}`);
    } catch (e) {
      console.warn(`[Puzzroo Setup] Could not clean up path: ${p}`, e);
    }
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  reactStrictMode: true,
}

module.exports = nextConfig
