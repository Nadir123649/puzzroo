import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers";
import { images, imageDimensions } from "@/lib/utils";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { Toaster } from "react-hot-toast";
import { NetworkToastListener } from "@/lib/toast";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-urbanist",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: '#6949FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://enhance-wrinkle-disjoin.ngrok-free.dev'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Puzzroo',
  },
  title: {
    default: "Puzzroo - Free Online Games, Chess & Brain Puzzles",
    template: "%s | Puzzroo Games",
  },
  description: "Play free online games on Puzzroo! Enjoy Chess, Sudoku, and brain-teasing puzzles. Compete against AI bots or challenge friends with instant browser play.",
  keywords: ["Puzzroo", "Chess", "Sudoku", "Online Games", "Free Puzzles", "Brain Games", "Mind Games", "Chess AI"],
  authors: [{ name: "Puzzroo Team" }],
  creator: "Puzzroo",
  icons: {
    icon: images.logo,
    shortcut: images.logo,
    apple: images.logo,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://puzzroo.com",
    title: "Puzzroo - SEO Optimized Landing Page",
    description: "A production-ready, SEO-optimized landing page built with Next.js, TypeScript, and Tailwind CSS.",
    siteName: "Puzzroo",
    images: [
      {
        url: images.ogImage,
        width: imageDimensions.og.width,
        height: imageDimensions.og.height,
        alt: "Puzzroo Landing Page",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Puzzroo - SEO Optimized Landing Page",
    description: "A production-ready, SEO-optimized landing page built with Next.js, TypeScript, and Tailwind CSS.",
    images: [images.twitterImage],
    creator: "@puzzroo",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={urbanist.variable}>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <ScrollToTop />
          <AnalyticsProvider />
          {children}
          <NetworkToastListener />
          <Toaster
            position="top-center"
            containerStyle={{ top: 16, left: '50%', transform: 'translateX(-50%)' }}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1F222A',
                color: '#fff',
                borderRadius: '12px',
                fontFamily: 'var(--font-urbanist)',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#22C55E', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#EF4444', secondary: '#fff' },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
