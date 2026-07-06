import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers";
import { images, imageDimensions } from "@/lib/utils";
import ScrollToTop from "@/components/layout/ScrollToTop";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Puzzroo - SEO Optimized Landing Page",
    template: "%s | Puzzroo",
  },
  description: "A production-ready, SEO-optimized landing page built with Next.js, TypeScript, and Tailwind CSS. Mobile-first responsive design with dark mode support.",
  keywords: ["Next.js", "React", "TypeScript", "Tailwind CSS", "SEO", "Landing Page", "Dark Mode"],
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
