import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Urbanist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers";
import { QueryProvider } from "@/providers/QueryProvider";
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
    title: "Puzzroo - Free Online Games, Chess & Brain Puzzles",
    description: "Play free online games on Puzzroo! Enjoy Chess, Sudoku, and brain-teasing puzzles. Compete against AI bots or challenge friends with instant browser play.",
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
    title: "Puzzroo - Free Online Games, Chess & Brain Puzzles",
    description: "Play free online games on Puzzroo! Enjoy Chess, Sudoku, and brain-teasing puzzles. Compete against AI bots or challenge friends with instant browser play.",
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
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS to prevent flash - loaded immediately */
            html { background-color: #ffffff; transition: none !important; }
            html.dark { background-color: #181A20 !important; color-scheme: dark; }
            html.dark body { background-color: #181A20 !important; }
            html.dark header { background-color: #181A20 !important; }
            body { transition: none !important; }
          `
        }} />
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                // Prevent unnecessary WebSocket initialization from reload.js browser extensions
                if (typeof window !== 'undefined') {
                  var OriginalWebSocket = window.WebSocket;
                  if (OriginalWebSocket) {
                    var MockWebSocket = function(url, protocols) {
                      var urlStr = url ? url.toString() : '';
                      if (urlStr.indexOf('/ws/ws') !== -1) {
                        return {
                          url: urlStr,
                          readyState: 3, // CLOSED
                          close: function() {},
                          send: function() {},
                          addEventListener: function() {},
                          removeEventListener: function() {},
                          dispatchEvent: function() { return false; },
                          onopen: null,
                          onclose: null,
                          onerror: null,
                          onmessage: null
                        };
                      }
                      return new OriginalWebSocket(url, protocols);
                    };
                    MockWebSocket.prototype = OriginalWebSocket.prototype;
                    Object.setPrototypeOf(MockWebSocket, OriginalWebSocket);
                    window.WebSocket = MockWebSocket;
                  }
                }
              } catch(e) {}

              try {
                var theme = localStorage.getItem('theme');
                var isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.backgroundColor = '#181A20';
                  document.documentElement.style.colorScheme = 'dark';
                }

                // Check auth status early to prevent navbar layout flash/flicker
                var isAuth = localStorage.getItem('puzzroo_auth') === 'true';
                if (isAuth) {
                  document.documentElement.classList.add('user-logged-in');
                } else {
                  document.documentElement.classList.add('user-logged-out');
                }
              } catch(e) {}
            })();
          `
        }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider>
            <ScrollToTop />
            <AnalyticsProvider />
            {children}
            <NetworkToastListener />
            <Toaster
              position="top-center"
              containerStyle={{ top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 999999 }}
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1F222A',
                  color: '#fff',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-urbanist)',
                  fontSize: '14px',
                  zIndex: 999999,
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
        </QueryProvider>
      </body>
    </html>
  );
}
