type RefreshCallback = (token: string) => void;
let onRefresh: RefreshCallback | null = null;

export function setOnRefresh(cb: RefreshCallback) {
  onRefresh = cb;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<{ success: boolean; payload: T; timestamp?: number }> {
  const { params, ...fetchOptions } = options;
  let url = path.startsWith("/api") ? `${API_BASE}${path}` : path;

  if (params) {
    const qs = new URLSearchParams(params).toString();
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

  let res = await fetch(url, { ...fetchOptions, headers, credentials: "include" });

  // Auto-refresh on 401
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      localStorage.setItem("accessToken", newToken);
      if (onRefresh) onRefresh(newToken);
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { ...fetchOptions, headers, credentials: "include" });
    }
  }

  const json = await res.json();
  return json;
}
