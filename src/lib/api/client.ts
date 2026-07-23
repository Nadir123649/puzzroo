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

  const accessToken = localStorage.getItem("accessToken");
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
      const error = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
      throw new Error(error?.error?.message || `HTTP ${res.status}`);
    }
    const json = await res.json();
    return json;
  } catch {
    // Network-level failure (offline / unreachable). Avoid duplicating the
    // offline banner; only toast when we believe we're actually online.
    if (!suppressToast && typeof navigator !== "undefined" && navigator.onLine) {
      notify.errorKey("SYSTEM_GENERIC_ERROR");
    }
    throw new Error("Network request failed");
  }
}
