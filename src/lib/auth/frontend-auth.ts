import { api } from "@/lib/api/client";

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
  avatar?: string
  provider?: string
  linkedProviders?: string[]
  hasPassword?: boolean
  isVerified?: boolean
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
    localStorage.setItem("accessToken", payload.token.accessToken);
    localStorage.setItem("puzzroo_auth", "true");
    localStorage.setItem("puzzroo_user", JSON.stringify(mapUser(payload.user)));
    window.dispatchEvent(new Event("auth-change"));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error. Please try again." };
  }
}

export async function logout(): Promise<void> {
  // Clear client state immediately so the UI reflects logged-out instantly.
  localStorage.removeItem("accessToken");
  localStorage.removeItem("puzzroo_auth");
  localStorage.removeItem("puzzroo_user");
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
  return !!localStorage.getItem("accessToken");
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
export async function ensureSession(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem("accessToken")) return;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("refresh_failed");
    const data = await res.json();
    const accessToken = data?.payload?.token?.accessToken;
    if (!accessToken) throw new Error("no_token");
    localStorage.setItem("accessToken", accessToken);
    // Re-read the profile so server-side changes (e.g. being promoted to
    // admin, subscription upgrades) take effect without a full re-login.
    try {
      const meRes = await api("/api/v1/users/me");
      if (meRes.success) {
        const current = getCurrentUser();
        const updated = mapUser(meRes.payload as any);
        localStorage.setItem("puzzroo_user", JSON.stringify({ ...current, ...updated }));
      }
    } catch {}
    window.dispatchEvent(new Event("auth-change"));
  } catch {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("puzzroo_auth");
    localStorage.removeItem("puzzroo_user");
    window.dispatchEvent(new Event("auth-change"));
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const str = localStorage.getItem("puzzroo_user");
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
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
    const payload = res.payload as any;
    if (payload.token?.accessToken) {
      localStorage.setItem("accessToken", payload.token.accessToken);
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function updateUser(updates: Partial<User>): Promise<boolean> {
  try {
    const body: Record<string, any> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (Object.keys(body).length === 0) return false;
    const res = await api("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!res.success) return false;
    const payload = res.payload as any;
    const current = getCurrentUser();
    if (current) {
      localStorage.setItem("puzzroo_user", JSON.stringify(mapUser(payload)));
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
      localStorage.setItem("puzzroo_user", JSON.stringify(mapUser({ ...payload.user, provider: current?.provider })));
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
      localStorage.setItem("puzzroo_user", JSON.stringify(mapUser({ ...payload.user, provider: current?.provider })));
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
      localStorage.setItem("accessToken", payload.token.accessToken);
    }
    localStorage.setItem("puzzroo_auth", "true");
    localStorage.setItem("puzzroo_user", JSON.stringify(mapUser(payload.user)));
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
      localStorage.setItem("accessToken", payload.token.accessToken);
      localStorage.setItem("puzzroo_auth", "true");
      localStorage.setItem("puzzroo_user", JSON.stringify(mapUser(payload.user)));
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
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("puzzroo_auth", "true");
    const meRes = await api("/api/v1/users/me");
    if (!meRes.success) return null;
    const user = mapUser(meRes.payload as any);
    localStorage.setItem("puzzroo_user", JSON.stringify(user));
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
    const payload = res.payload as any;
    if (payload.token?.accessToken) {
      localStorage.setItem("accessToken", payload.token.accessToken);
      localStorage.setItem("puzzroo_auth", "true");
      localStorage.setItem("puzzroo_user", JSON.stringify(mapUser(payload.user)));
      window.dispatchEvent(new Event("auth-change"));
    }
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
    localStorage.removeItem("accessToken");
    localStorage.removeItem("puzzroo_auth");
    localStorage.removeItem("puzzroo_user");
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

export async function fetchBillingHistory(): Promise<any> {
  const res = await api("/api/v1/billing/history");
  if (!res.success) return null;
  return res.payload;
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
  return {
    id: u.id,
    publicId: u.publicId,
    name: u.name || u.username,
    email: u.email || "",
    username: u.username,
    usernameSet: u.usernameSet,
    role: u.role || "free",
    joinedDate: u.createdAt ? formatDate(u.createdAt) : "N/A",
    createdAt: u.createdAt,
    accountStatus: u.status || "active",
    subscriptionPlan: u.role || "free",
    avatar: u.avatar,
    provider: u.provider || "email",
    linkedProviders: u.linkedProviders || [],
    hasPassword: u.hasPassword,
    isVerified: u.isVerified,
  };
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${date.toLocaleString("en", { month: "short" })} ${date.getFullYear()}`;
}
