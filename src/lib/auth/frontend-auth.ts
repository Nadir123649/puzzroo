import { api, refreshAccessToken } from "@/lib/api/client";

const TOKEN_KEY = "puzzroo_access_token";
const FLAG_KEY = "puzzroo_auth";
const USER_KEY = "puzzroo_user";

let currentAccessToken: string | null = null;

// The access token used to be kept in localStorage so full page loads don't
// trigger a refresh round trip. That still holds for REMEMBERED sessions.
//
// "Remember me" semantics on storage:
//  - remembered (checkbox ON) → localStorage. Session survives across tabs and
//    browser restarts (the refresh cookie is a 7-day cookie).
//  - NOT remembered (checkbox OFF) → sessionStorage. Auth is scoped to the tab
//    that signed in. Closing that tab — or opening a NEW tab — clears it, so
//    the site opens logged-out. (The refresh cookie is a session cookie too.)
//
// Every auth read/write below routes through the active scope so both modes
// stay consistent.

const canUseStorage = () => typeof window !== "undefined";

function getAuthScope(): Storage {
  if (!canUseStorage()) return null as unknown as Storage;
  try {
    // sessionStorage flag wins: it means this session is tab-scoped.
    if (sessionStorage.getItem(FLAG_KEY) === "true") return sessionStorage;
    return localStorage;
  } catch {
    return localStorage;
  }
}

export function hasStoredAuth(): boolean {
  if (!canUseStorage()) return false;
  try {
    return sessionStorage.getItem(FLAG_KEY) === "true" || localStorage.getItem(FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

export function isRememberedSession(): boolean {
  if (!canUseStorage()) return true;
  return getAuthScope() !== sessionStorage;
}

function writeAccessToken(token: string, remember: boolean): void {
  if (!canUseStorage()) return;
  try {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

function readAccessToken(): string | null {
  if (!canUseStorage()) return null;
  try { return getAuthScope().getItem(TOKEN_KEY); } catch { return null; }
}

function writeStoredUser(userJson: string, remember?: boolean): void {
  if (!canUseStorage()) return;
  const target = remember !== undefined ? (remember ? localStorage : sessionStorage) : getAuthScope();
  try { target.setItem(USER_KEY, userJson); } catch {}
}

function readStoredUser(): User | null {
  if (!canUseStorage()) return null;
  try {
    const raw = getAuthScope().getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// One-shot full-session persist (login / oauth / bootstrap). Writes token +
// flag + user into the chosen scope and scrubs the other scope so a remember
// toggle can never leave a "logged in" ghost in localStorage.
export function storeAuth(remember: boolean, token: string, userJson: string): void {
  currentAccessToken = token;
  if (!canUseStorage()) return;
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  try {
    target.setItem(TOKEN_KEY, token);
    target.setItem(FLAG_KEY, "true");
    target.setItem(USER_KEY, userJson);
    [TOKEN_KEY, FLAG_KEY, USER_KEY].forEach((k) => other.removeItem(k));
  } catch {}
}

export function setAuthFlag(remember: boolean): void {
  if (!canUseStorage()) return;
  try {
    (remember ? localStorage : sessionStorage).setItem(FLAG_KEY, "true");
    (remember ? sessionStorage : localStorage).removeItem(FLAG_KEY);
  } catch {}
}

export function setAuthUser(userJson: string, remember?: boolean): void {
  if (remember !== undefined) {
    if (!canUseStorage()) return;
    const target = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    try {
      target.setItem(USER_KEY, userJson);
      other.removeItem(USER_KEY);
    } catch {}
  } else {
    writeStoredUser(userJson);
  }
}

export function setAccessToken(token: string, remember?: boolean): void {
  currentAccessToken = token;
  writeAccessToken(token, remember === undefined ? isRememberedSession() : remember);
}

export function getAccessToken(): string | null {
  if (currentAccessToken !== null) return currentAccessToken;
  return readAccessToken();
}

export function clearAccessToken(): void {
  currentAccessToken = null;
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

// Wipes the full client-side auth state (token + flag + user) from BOTH
// storages. Use this for logout / session-expiry / account deletion.
export function clearAuthState(): void {
  currentAccessToken = null;
  if (!canUseStorage()) return;
  try {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(TOKEN_KEY);
      s.removeItem(FLAG_KEY);
      s.removeItem(USER_KEY);
    });
  } catch {}
}

export function getStoredUser(): User | null {
  return readStoredUser();
}

if (typeof window !== "undefined") {
  try {
    const legacy = localStorage.getItem("accessToken");
    if (legacy) {
      currentAccessToken = legacy;
      localStorage.removeItem("accessToken");
      writeAccessToken(legacy, true);
    } else {
      currentAccessToken = readAccessToken();
    }
  } catch {}
}

export interface User {
  id: string
  publicId?: string
  name: string
  email: string
  username: string
  usernameSet?: boolean
  role?: string
  joinedDate: string
  createdAt?: string
  accountStatus: string
  subscriptionPlan: string
  avatar?: string | null
  provider?: string
  linkedProviders?: string[]
  hasPassword?: boolean
  isVerified?: boolean
  theme?: string | null
}

export async function login(identifier: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    const res = await api("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password, rememberMe }),
    });
    if (!res.success) {
      const err = (res.payload as any)?.error;
      return { success: false, error: err?.message || "Invalid email or password", code: err?.code };
    }
    const payload = res.payload as any;
    storeAuth(rememberMe, payload.token.accessToken, JSON.stringify(mapUser(payload.user)));
    applyUserTheme(payload.user?.theme);
    window.dispatchEvent(new Event("auth-change"));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error. Please try again." };
  }
}

export async function logout(): Promise<void> {
  // Clear client state immediately so the UI reflects logged-out instantly.
  clearAuthState();
  window.dispatchEvent(new Event("auth-change"));

  // Server cleanup + Firebase signOut — fire in background, never block.
  api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
  try {
    const [{ auth }, { signOut }] = await Promise.all([
      import("@/lib/config/firebase-client"),
      import("firebase/auth"),
    ]);
    if (auth) signOut(auth).catch(() => {});
  } catch {}
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!getAccessToken() || hasStoredAuth();
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < (now + 30);
  } catch {
    return true;
  }
}

function clearClientSession() {
  clearAuthState();
  window.dispatchEvent(new Event("auth-change"));
  api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
}

/**
 * Validates (and repairs) the client session on app load.
 * - No token at all → nothing to do (user is logged out).
 * - Token present → attempt to refresh via the httpOnly refresh cookie.
 *   On success we store the fresh access token; on failure the session is
 *   stale/expired, so we clear localStorage and let the UI reflect logged-out.
 * This prevents a dead/expired accessToken from permanently bouncing users
 * away from /login (the RedirectIfAuthenticated guard keys off isLoggedIn()).
 */

// Prevent parallel refresh calls (race condition protection)
let refreshPromise: Promise<void> | null = null;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 2000; // 2 seconds cooldown between refreshes

export async function ensureSession(): Promise<void> {
  if (typeof window === "undefined") return;
  
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }
  
  // Prevent rapid successive calls (cooldown period)
  const now = Date.now();
  if (now - lastRefreshTime < REFRESH_COOLDOWN) {
    return;
  }
  
  const token = getAccessToken();
  const hasFlag = hasStoredAuth();
  if (!token && !hasFlag) return;

  // A persistent-refresh session is the ONLY authority a page reload can trust.
  // The access token (and cached profile) live in localStorage and outlive the
  // server session: if "Remember me" was unchecked the refresh cookie is a
  // session cookie, so closing the browser kills it while localStorage
  // survives. Without this probe a stale token would masquerade as a live
  // login for up to its expiry. A definitive `valid:false` logs us out; a
  // network blip is inconclusive and leaves the state intact (the normal
  // api() 401 flow handles genuinely expired sessions).
  try {
    const probe = await api<{ valid: boolean }>("/api/v1/auth/session-exists");
    if (!probe.success) throw new Error("probe_failed");
    if (probe.payload?.valid === false) {
      clearClientSession();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return;
    }
  } catch {
    // Inconclusive — keep cached state, the 401 path will reconcile.
  }

  if (token && !isTokenExpired(token)) {
    refreshPromise = (async () => {
      try {
        lastRefreshTime = Date.now();
        const meRes = await api("/api/v1/users/me");
        if (meRes.success) {
          const current = getStoredUser();
          const updated = mapUser(meRes.payload as any);
          setAuthUser(JSON.stringify({ ...current, ...updated }));
          applyUserTheme(updated.theme);
          window.dispatchEvent(new Event("auth-change"));
        }
        // A failed /users/me is TRANSIENT, not proof the session died: during
        // rapid page refreshes the per-IP rate limit (429) or a network blip
        // makes this fail while the refresh cookie is perfectly alive. The
        // session-exists probe above is the authoritative liveness check and
        // the api() 401 flow handles genuinely revoked sessions — never log
        // out from a profile fetch failure.
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  }

  // Token is expired, try to refresh
  refreshPromise = (async () => {
    try {
      lastRefreshTime = Date.now();
      const newToken = await refreshAccessToken();
      if (!newToken) throw new Error("refresh_failed");
      setAccessToken(newToken);
      // Re-read the profile so server-side changes (e.g. being promoted to
      // admin, subscription upgrades) take effect without a full re-login.
      try {
        const meRes = await api("/api/v1/users/me");
        if (meRes.success) {
          const current = getStoredUser();
          const updated = mapUser(meRes.payload as any);
          setAuthUser(JSON.stringify({ ...current, ...updated }));
          applyUserTheme(updated.theme);
        }
      } catch {}
      window.dispatchEvent(new Event("auth-change"));
    } catch {
      // Refresh failed — likely stale cookie from rapid page refresh, not actual
      // session expiry. Leave client state intact; the next API call or page
      // refresh will retry. The api() 401 handler handles truly-expired sessions.
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export function getCurrentUser(): User | null {
  return getStoredUser();
}

export async function getLastLoginInfo(): Promise<{ lastLogin: string; device: string; location: string } | null> {
  try {
    const res = await api("/api/v1/users/me");
    if (!res.success) return null;
    const user = (res.payload as any);
    if (user.lastLoginAt) {
      return { lastLogin: formatDate(user.lastLoginAt), device: "Web", location: "" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api("/api/v1/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
    });
    if (!res.success) {
      return { success: false, error: (res.payload as any)?.error?.message || "Failed to change password" };
    }
    // Server revoked every session (all devices, this one included). Clear
    // local auth state — the user must sign in again with the new password.
    clearAuthState();
    window.dispatchEvent(new Event("auth-change"));
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function updateUser(updates: Partial<User>): Promise<boolean> {
  try {
    const body: Record<string, any> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.avatar !== undefined) body.avatar = updates.avatar;
    if (updates.theme !== undefined) body.theme = updates.theme;
    if (Object.keys(body).length === 0) return false;
    const res = await api("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!res.success) return false;
    const payload = res.payload as any;
    const current = getCurrentUser();
    if (current) {
      setAuthUser(JSON.stringify(mapUser(payload)));
      window.dispatchEvent(new Event("auth-change"));
    }
    return true;
  } catch {
    return false;
  }
}

export async function manageEmail(email: string, password?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api("/api/v1/auth/manage-email", {
      method: "POST",
      body: JSON.stringify({ email, ...(password ? { password } : {}) }),
    });
    if (!res.success) {
      return { success: false, error: (res.payload as any)?.error?.message || "Failed to update email" };
    }
    const payload = res.payload as any;
    if (payload.user) {
      const current = getCurrentUser();
      setAuthUser(JSON.stringify(mapUser({ ...payload.user, provider: current?.provider })));
      window.dispatchEvent(new Event("auth-change"));
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function unlinkProvider(provider: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api("/api/v1/auth/unlink-provider", {
      method: "POST",
      body: JSON.stringify({ provider }),
    });
    if (!res.success) {
      return { success: false, error: (res.payload as any)?.error?.message || "Failed to unlink provider" };
    }
    const payload = res.payload as any;
    if (payload.user) {
      const current = getCurrentUser();
      setAuthUser(JSON.stringify(mapUser({ ...payload.user, provider: current?.provider })));
      window.dispatchEvent(new Event("auth-change"));
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function setUsername(username: string): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    const res = await api("/api/v1/auth/set-username", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
    if (!res.success) {
      const err = (res.payload as any)?.error;
      return { success: false, error: err?.message || "Failed to set username", code: err?.code };
    }
    const payload = res.payload as any;
    if (payload.token?.accessToken) {
      setAccessToken(payload.token.accessToken);
    }
    setAuthFlag(isRememberedSession());
    setAuthUser(JSON.stringify(mapUser(payload.user)));
    window.dispatchEvent(new Event("auth-change"));
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function linkAndMerge(username: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api("/api/v1/auth/link-and-merge", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
    if (!res.success) {
      return { success: false, error: (res.payload as any)?.error?.message || "Failed to link accounts" };
    }
    const payload = res.payload as any;
    if (payload.token?.accessToken) {
      setAccessToken(payload.token.accessToken);
      setAuthFlag(isRememberedSession());
      setAuthUser(JSON.stringify(mapUser(payload.user)));
      window.dispatchEvent(new Event("auth-change"));
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

// Bootstraps a client session from an httpOnly refresh cookie (used after the
// email-verification auto-login redirect). Returns the mapped user on success.
export async function bootstrapSession(): Promise<User | null> {
  try {
    const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/v1/auth/refresh`, { method: "POST", credentials: "include" });
    if (!refreshRes.ok) return null;
    const refreshData = await refreshRes.json();
    const accessToken = refreshData?.payload?.token?.accessToken;
    if (!accessToken) return null;
    setAccessToken(accessToken);
    setAuthFlag(true);
    const meRes = await api("/api/v1/users/me");
    if (!meRes.success) return null;
    const user = mapUser(meRes.payload as any);
    setAuthUser(JSON.stringify(user));
    window.dispatchEvent(new Event("auth-change"));
    return user;
  } catch {
    return null;
  }
}

export async function register(name: string, email: string, password: string): Promise<{ success: boolean; error?: string; code?: string; linking?: boolean; message?: string }> {
  try {
    const res = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.success) {
      const err = (res.payload as any)?.error;
      return { success: false, error: err?.message || "Registration failed", code: err?.code };
    }
    const payload = res.payload as any;
    return { success: true, linking: !!payload?.linking, message: payload?.message || '' };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api(`/api/v1/passwords/reset`, {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    if (!res.success) {
      return { success: false, error: (res.payload as any)?.error?.message || "Failed to reset password" };
    }
    // Deliberately no session is started here: the user must log in with the
    // new password themselves. Also clear any stale local auth state: every
    // device (including this one) was logged out server-side.
    clearAuthState();
    window.dispatchEvent(new Event("auth-change"));
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api("/api/v1/passwords/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!res.success) {
      return { success: false, error: (res.payload as any)?.error?.message || "Failed to send reset email" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api("/api/v1/verification/email/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!res.success) {
      return { success: false, error: (res.payload as any)?.error?.message || "Failed to resend verification email" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api("/api/v1/users/me", { method: "DELETE" });
    if (!res.success) {
      return { success: false, error: (res.payload as any)?.error?.message || "Failed to delete account" };
    }
    clearAuthState();
    window.dispatchEvent(new Event("auth-change"));
    return { success: true };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

export async function fetchSessions(): Promise<any[]> {
  try {
    const res = await api("/api/v1/sessions");
    if (!res.success) return [];
    return (res.payload as any) || [];
  } catch {
    return [];
  }
}

export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    const res = await api(`/api/v1/sessions/${sessionId}`, { method: "DELETE" });
    return res.success;
  } catch {
    return false;
  }
}

export async function fetchUserProfile(): Promise<any> {
  const res = await api("/api/v1/users/me");
  if (!res.success) return null;
  return res.payload;
}

/**
 * Fetch the profile from the server, merge it into the stored snapshot, and
 * notify the rest of the app (navbar etc. via 'auth-change'). Used to pick up
 * changes made on OTHER devices (name, avatar, role, plan, theme) without a
 * reload or re-login.
 */
export async function refreshUserProfile(): Promise<User | null> {
  const res = await api("/api/v1/users/me");
  if (!res.success) return null;
  const current = getStoredUser();
  const updated = mapUser(res.payload as any);
  setAuthUser(JSON.stringify({ ...current, ...updated }));
  applyUserTheme(updated.theme);
  window.dispatchEvent(new Event("auth-change"));
  return updated;
}

export async function fetchBillingHistory(): Promise<any> {
  const res = await api("/api/v1/billing/history");
  if (!res.success) return null;
  return res.payload;
}

export function getGuestId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("puzzroo_guest_id");
}

export function ensureGuestId(): string {
  let id = getGuestId()
  if (!id) {
    id = crypto.randomUUID()
    try {
      localStorage.setItem("puzzroo_guest_id", id)
    } catch {}
  }
  return id
}

export async function signInGuest(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (getAccessToken()) return true;
  ensureGuestId()
  return true
}

export async function fetchGameStats(): Promise<any> {
  const res = await api("/api/v1/games/stats");
  if (!res.success) return null;
  return res.payload;
}

export async function fetchSubscription(): Promise<any> {
  const res = await api("/api/v1/subscriptions/me");
  if (!res.success) return null;
  return res.payload;
}

export async function fetchActivity(limit: number = 15): Promise<any[]> {
  try {
    const res = await api(`/api/v1/users/me/activity?limit=${limit}`);
    if (!res.success) return [];
    return ((res.payload as any)?.events as any[]) || [];
  } catch {
    return [];
  }
}

export async function submitContact(name: string, email: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api("/api/v1/contact", {
      method: "POST",
      body: JSON.stringify({ name, email, message }),
    });
    if (!res.success) {
      return { success: false, error: (res.payload as any)?.error?.message || "Failed to submit" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function fetchEmailPreferences(): Promise<any> {
  const res = await api("/api/v1/preferences");
  if (!res.success) return null;
  return res.payload;
}

export async function updateEmailPreferences(prefs: Record<string, boolean>): Promise<boolean> {
  const res = await api("/api/v1/preferences", {
    method: "PATCH",
    body: JSON.stringify(prefs),
  });
  return res.success;
}

function mapUser(u: any): User {
  const mappedRole = u.role === "premium" ? "free" : (u.role || "free");
  return {
    id: u.id,
    publicId: u.publicId,
    name: u.name || u.username,
    email: u.email || "",
    username: u.username,
    usernameSet: u.usernameSet,
    role: mappedRole,
    joinedDate: u.createdAt ? formatDate(u.createdAt) : "N/A",
    createdAt: u.createdAt,
    accountStatus: u.status || "active",
    subscriptionPlan: mappedRole,
    avatar: u.avatar,
    provider: u.provider || "email",
    linkedProviders: u.linkedProviders || [],
    hasPassword: u.hasPassword,
    isVerified: u.isVerified,
    theme: u.theme || null,
  };
}

function mapUserForStorage(u: any): Partial<User> {
  return {
    id: u.id,
    publicId: u.publicId,
    name: u.name || u.username,
    username: u.username,
    usernameSet: u.usernameSet,
    role: u.role || "free",
    avatar: u.avatar,
  };
}

/**
 * Applies a user's server-stored theme to the document and localStorage.
 * Fires a "theme-change" event so ThemeProvider keeps its state in sync.
 * No-op for anonymous users (null theme = follow system/local preference).
 */
export function applyUserTheme(theme?: string | null): void {
  if (typeof window === "undefined") return;
  if (!theme || (theme !== "light" && theme !== "dark")) return;
  try { localStorage.setItem("theme", theme) } catch {}
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  window.dispatchEvent(new Event("theme-change"));
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${date.toLocaleString("en", { month: "short" })} ${date.getFullYear()}`;
}
