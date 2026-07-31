import { notify } from '@/lib/toast'
import { getAccessToken, setAccessToken, getGuestId } from '@/lib/auth/frontend-auth'

type RefreshCallback = (token: string) => void;
let onRefresh: RefreshCallback | null = null;
let sessionExpiredNotified = false;
let refreshPromise: Promise<string | null> | null = null;

// Track pending API requests to prevent duplicate calls
const pendingRequests = new Map<string, Promise<any>>();

export function setOnRefresh(cb: RefreshCallback) {
  onRefresh = cb;
}

const isClient = typeof window !== "undefined";
const isLocalhost = isClient && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE = !isLocalhost && isClient 
  ? "" 
  : (process.env.NEXT_PUBLIC_API_BASE_URL || "");

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!isClient) return null;
  // If user is not logged in (no puzzroo_auth in localStorage), do not attempt refresh
  if (!localStorage.getItem("puzzroo_auth")) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, { method: "POST", credentials: "include" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("puzzroo_auth");
        }
        return null;
      }
      const data = await res.json();
      return data.payload?.token?.accessToken || null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function api<T = any>(
  path: string,
  options: RequestInit & { 
    params?: Record<string, string | number | boolean | undefined>
    suppressToast?: boolean
  } = {}
): Promise<{ success: boolean; payload: T; timestamp?: number }> {
  const { params, suppressToast, ...fetchOptions } = options;
  let url = path.startsWith("/api") ? `${API_BASE}${path}` : path;

  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    url += `?${qs}`;
  }

  // Create a unique key for this request (GET requests only, for deduplication)
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const requestKey = `${method}:${url}`;
  
  // For GET requests, check if there's already a pending request
  if (method === 'GET' && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey)!;
  }

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  let accessToken = getAccessToken();
  const userIsLoggedIn = isClient && !!localStorage.getItem("puzzroo_auth");

  if (!accessToken && userIsLoggedIn) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      setAccessToken(newToken);
      if (onRefresh) onRefresh(newToken);
      accessToken = newToken;
    }
  } else if (accessToken && isTokenExpired(accessToken) && userIsLoggedIn) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      setAccessToken(newToken);
      if (onRefresh) onRefresh(newToken);
      accessToken = newToken;
    }
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  } else if (isClient) {
    const guestId = getGuestId();
    if (guestId) {
      headers["x-guest-id"] = guestId;
    }
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Create the promise for this request
  const requestPromise = (async () => {
    try {
      let res = await fetch(url, { ...fetchOptions, headers, credentials: "include", keepalive: true });

      // Auto-refresh on 401 only for logged-in users
      if (res.status === 401 && userIsLoggedIn) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setAccessToken(newToken);
          if (onRefresh) onRefresh(newToken);
          headers["Authorization"] = `Bearer ${newToken}`;
          res = await fetch(url, { ...fetchOptions, headers, credentials: "include", keepalive: true });
        } else if (!sessionExpiredNotified) {
          // Refresh failed — could be a transient blip (network hiccup, rate
          // limit). Retry once with a short delay before declaring the session
          // dead, so a live session is never logged out on a single flake.
          const retryToken = await new Promise<string | null>((resolve) =>
            setTimeout(() => resolve(refreshAccessToken()), 1500)
          );
          if (retryToken) {
            setAccessToken(retryToken);
            if (onRefresh) onRefresh(retryToken);
            headers["Authorization"] = `Bearer ${retryToken}`;
            res = await fetch(url, { ...fetchOptions, headers, credentials: "include", keepalive: true });
          } else if (!sessionExpiredNotified) {
            sessionExpiredNotified = true;
            notify.errorKey("SYSTEM_SESSION_EXPIRED");
            localStorage.removeItem("puzzroo_auth");
            setTimeout(() => { window.location.href = "/login"; }, 1500);
          }
        }
      }

      if (res.status === 429 && !sessionExpiredNotified) {
        notify.errorKey("SYSTEM_RATE_LIMITED");
      }

      if (!res.ok) {
        // Server returned an error (4xx/5xx) — return the body as-is so callers
        // can check !res.success and read payload.error. Don't throw: the catch
        // block below is for true network failures.
        return await res.json().catch(() => ({ success: false, payload: { error: { message: `HTTP ${res.status}` } } }));
      }
      const json = await res.json();
      return json;
    } catch (err) {
      // Silent abort — StrictMode double-mount or race condition
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      // True network-level failure (offline / unreachable).
      if (typeof navigator !== "undefined" && navigator.onLine) {
        notify.errorKey("SYSTEM_GENERIC_ERROR");
      }
      throw new Error("Network request failed");
    } finally {
      // Clean up the pending request after it completes
      if (method === 'GET') {
        pendingRequests.delete(requestKey);
      }
    }
  })();

  // Store the promise for GET requests to prevent duplicates
  if (method === 'GET') {
    pendingRequests.set(requestKey, requestPromise);
  }

  return requestPromise;
}
