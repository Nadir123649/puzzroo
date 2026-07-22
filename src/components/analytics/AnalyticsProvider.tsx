"use client";

import { useEffect, useRef, Suspense } from "react";
import { analytics } from "@/lib/analytics/client";
import { getCurrentUser } from "@/lib/auth/frontend-auth";

function AnalyticsTracker() {
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
        analytics.track("logged_out");
        analytics.reset();
        lastIdentified.current = null;
      }
    };
    syncIdentity();
    window.addEventListener("auth-change", syncIdentity);
    return () => window.removeEventListener("auth-change", syncIdentity);
  }, []);

  return null;
}

export function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}
