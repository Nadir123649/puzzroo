import { notify } from '@/lib/toast'

type RefreshCallback = (token: string) => void;
let onRefresh: RefreshCallback | null = null;
let sessionExpiredNotified = false;

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

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.payload?.token?.accessToken || null;
  } catch {
    return null;
  }
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

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  let accessToken = localStorage.getItem("accessToken");
  if (accessToken && isTokenExpired(accessToken)) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      localStorage.setItem("accessToken", newToken);
      if (onRefresh) onRefresh(newToken);
      accessToken = newToken;
    }
  }
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (!(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  try {
    let res = await fetch(url, { ...fetchOptions, headers, credentials: "include" });

    // Auto-refresh on 401
    if (res.status === 401 && accessToken) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        localStorage.setItem("accessToken", newToken);
        if (onRefresh) onRefresh(newToken);
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(url, { ...fetchOptions, headers, credentials: "include" });
      } else if (!sessionExpiredNotified) {
        sessionExpiredNotified = true;
        notify.errorKey("SYSTEM_SESSION_EXPIRED");
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
  } catch {
    // True network-level failure (offline / unreachable).
    if (typeof navigator !== "undefined" && navigator.onLine) {
      notify.errorKey("SYSTEM_GENERIC_ERROR");
    }
    throw new Error("Network request failed");
  }
}
