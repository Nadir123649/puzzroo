"use client";

import { useEffect, Suspense } from "react";
import { analytics } from "@/lib/analytics/client";
import { getCurrentUser } from "@/lib/auth/frontend-auth";

// The track API fires only on the login event itself — no pageview or
// per-click tracking. The guard is persisted so identify runs once per
// login, not once per page load/reload.
const IDENTITY_KEY = "pz_identified_user_id";

function AnalyticsTracker() {
  useEffect(() => {
    const syncIdentity = () => {
      let storedId: string | null = null;
      try {
        storedId = localStorage.getItem(IDENTITY_KEY);
      } catch {}
      const user = getCurrentUser();
      if (user?.id) {
        if (storedId !== user.id) {
          try {
            localStorage.setItem(IDENTITY_KEY, user.id);
          } catch {}
          analytics.identify(user.id, {
            username: user.username,
            plan: user.subscriptionPlan,
            provider: user.provider,
          });
        }
      } else if (storedId) {
        analytics.track("logged_out");
        analytics.reset();
        try {
          localStorage.removeItem(IDENTITY_KEY);
        } catch {}
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
