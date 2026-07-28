"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { User } from "@/lib/auth/frontend-auth";

function mapUser(u: any): User {
  const formatDate = (iso: string): string => {
    const date = new Date(iso);
    return `${date.getDate()} ${date.toLocaleString("en", { month: "short" })} ${date.getFullYear()}`;
  };

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

async function fetchUser(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  try {
    const res = await api("/api/v1/users/me");
    if (!res.success) return null;
    const user = mapUser(res.payload as any);
    // Update localStorage cache
    localStorage.setItem("puzzroo_user", JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

/**
 * React Query hook for fetching and caching user data.
 * This replaces multiple duplicate API calls with a single cached request.
 */
export function useUser(enabled: boolean = true) {
  return useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
    enabled: enabled && typeof window !== "undefined" && !!localStorage.getItem("accessToken"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
