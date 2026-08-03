import type { Metadata, Viewport } from "next";
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
        <script id="theme-init" dangerouslySetInnerHTML={{
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
                var isAuth = sessionStorage.getItem('puzzroo_auth') === 'true' || localStorage.getItem('puzzroo_auth') === 'true';
                if (isAuth) {
                  document.documentElement.classList.add('user-logged-in');
                } else {
                  document.documentElement.classList.add('user-logged-out');
                }
              } catch(e) {}

              try {
                // Browser extensions (reload.js, translators, ad/toolbar helpers) inject
                // elements directly into <body> before React hydrates. React's hydration
                // walk starts at body.firstChild, hits the foreign node, and throws
                // "Minified React error #418" (recoverable, but noisy). Move such nodes
                // to the end of <body> during the pre-hydration window so React's walk
                // only sees its own markup. Nodes inserted after hydration are harmless
                // and left alone. Only raw element nodes are moved; scripts, styles,
                // links, templates, comments and text nodes are ignored.
                if (typeof MutationObserver !== 'undefined') {
                  var hydrateGuard = (function() {
                    var ALLOWED = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, TEMPLATE: 1, NOSCRIPT: 1, BASE: 1 };
                    var done = false;
                    var obs = null;
                    var stop = function() {
                      done = true;
                      if (obs) { try { obs.disconnect(); } catch(e) {} }
                    };
                    var reactAttached = function(node) {
                      if (!node || typeof Object.getOwnPropertySymbols !== 'function') return false;
                      var syms = Object.getOwnPropertySymbols(node);
                      for (var i = 0; i < syms.length; i++) {
                        var d = syms[i].description;
                        if (d && (d.indexOf('__reactFiber') === 0 || d.indexOf('__reactInternalInstance') === 0)) return true;
                      }
                      return false;
                    };
                    var isForeign = function(n) {
                      var snapshot = window.__pzBodyMarkup;
                      if (!snapshot) return false;
                      if (ALLOWED[n.tagName]) return false;
                      if (n.__pzChecked) return false;
                      n.__pzChecked = true;
                      var html = '';
                      try { html = n.outerHTML; } catch(e) { return false; }
                      return html.length > 0 && snapshot.indexOf(html) === -1;
                    };
                    var sweep = function() {
                      if (done || !document.body || reactAttached(document.body)) return;
                      var kids = document.body.childNodes;
                      var foreign = [];
                      for (var i = 0; i < kids.length; i++) {
                        var n = kids[i];
                        if (n.nodeType !== 1) continue;
                        if (isForeign(n)) foreign.push(n);
                      }
                      for (var k = 0; k < foreign.length; k++) {
                        try { document.body.appendChild(foreign[k]); } catch(e) {}
                      }
                    };
                    var onMutations = function(muts) {
                      if (done || !document.body) return;
                      if (reactAttached(document.body)) { stop(); return; }
                      for (var i = 0; i < muts.length; i++) {
                        var added = muts[i].addedNodes;
                        for (var j = 0; j < added.length; j++) {
                          var n = added[j];
                          if (n.nodeType !== 1) continue;
                          if (n.parentNode && n.parentNode === document.body && isForeign(n)) {
                            try { document.body.appendChild(n); } catch(e) {}
                          }
                        }
                      }
                    };
                    var start = function() {
                      if (done || !document.body) return;
                      sweep();
                      if (done || reactAttached(document.body)) { stop(); return; }
                      obs = new MutationObserver(onMutations);
                      obs.observe(document.body, { childList: true });
                      window.addEventListener('load', stop);
                      setTimeout(stop, 10000);
                    };
                    // The snapshot must be taken AFTER the parser finishes but BEFORE
                    // any DOMContentLoaded listener runs (extensions register theirs
                    // first and inject immediately). readyState 'interactive' fires
                    // before DOMContentLoaded dispatch, so it is the right moment.
                    var snapshotTaken = false;
                    var takeSnapshot = function() {
                      if (snapshotTaken || !document.body) return;
                      snapshotTaken = true;
                      try { window.__pzBodyMarkup = document.body.innerHTML; } catch(e) {}
                    };
                    if (document.readyState === 'loading') {
                      document.addEventListener('readystatechange', function() {
                        if (document.readyState === 'interactive') takeSnapshot();
                      });
                      document.addEventListener('DOMContentLoaded', start);
                    } else {
                      takeSnapshot();
                      start();
                    }
                  })();
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
