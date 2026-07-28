"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { analytics } from "@/lib/analytics/client";

/**
 * Hook to track page views only once per route change.
 * Prevents duplicate analytics events from re-renders or React Strict Mode.
 */
export function usePageTracking() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    // Only track if the pathname actually changed
    if (pathname && pathname !== lastTracked.current) {
      lastTracked.current = pathname;
      analytics.page(pathname);
    }
  }, [pathname]);
}
