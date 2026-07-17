"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analytics } from "@/lib/analytics/client";
import { getCurrentUser } from "@/lib/auth/frontend-auth";

const HEARTBEAT_MS = 2 * 60 * 1000; // 2 min while the tab is visible

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastIdentified = useRef<string | null>(null);

  // Identify the current user on mount + whenever auth changes.
  useEffect(() => {
    const syncIdentity = () => {
      const user = getCurrentUser();
      if (user?.id) {
        if (lastIdentified.current !== user.id) {
          lastIdentified.current = user.id;
          analytics.identify(user.id, {
            username: user.username,
            plan: user.subscriptionPlan,
            provider: user.provider,
          });
        }
      } else if (lastIdentified.current) {
        // Was logged in, now logged out.
        analytics.track("logged_out");
        analytics.reset();
        lastIdentified.current = null;
      }
    };
    syncIdentity();
    window.addEventListener("auth-change", syncIdentity);
    return () => window.removeEventListener("auth-change", syncIdentity);
  }, []);

  // Page view on every route change (path or query).
  useEffect(() => {
    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    analytics.page(path || undefined);
  }, [pathname, searchParams]);

  // Heartbeat to keep "last active" fresh while the tab is visible.
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") analytics.track("heartbeat");
    };
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}

export function AnalyticsProvider() {
  // useSearchParams requires a Suspense boundary in the app router.
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}
