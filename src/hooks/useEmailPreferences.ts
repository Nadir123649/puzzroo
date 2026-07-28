"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

interface EmailPreference {
  id: string;
  title: string;
  description: string;
  iconName: 'mail' | 'bell' | 'shield' | 'book';
  enabled: boolean;
}

const defaultPreferences: EmailPreference[] = [
  {
    id: 'updates',
    title: 'Puzzroo Updates',
    description: 'Get notified about new features, games, and platform updates',
    iconName: 'mail',
    enabled: true,
  },
  {
    id: 'daily-challenge',
    title: 'Daily Challenge Reminder',
    description: 'Receive a daily email reminder to solve today\'s puzzle',
    iconName: 'bell',
    enabled: true,
  },
  {
    id: 'competition',
    title: 'Competition & Social Alerts',
    description: 'Updates about leaderboards, achievements, and community events',
    iconName: 'shield',
    enabled: false,
  },
  {
    id: 'tips',
    title: 'Game Tips & Tutorials',
    description: 'Learn new strategies and improve your puzzle-solving skills',
    iconName: 'book',
    enabled: true,
  },
  {
    id: 'security',
    title: 'Account Security Notices',
    description: 'Important alerts about login activity and security updates',
    iconName: 'shield',
    enabled: true,
  },
];

async function fetchEmailPreferences(): Promise<EmailPreference[]> {
  try {
    const res = await api("/api/v1/preferences");
    if (!res.success) return defaultPreferences;
    const data = res.payload as any;
    return data?.preferences || defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

async function updateEmailPreferences(prefs: Record<string, boolean>): Promise<boolean> {
  try {
    const res = await api("/api/v1/preferences", {
      method: "PATCH",
      body: JSON.stringify(prefs),
    });
    return res.success;
  } catch {
    return false;
  }
}

/**
 * React Query hook for managing email preferences.
 * Prevents duplicate API calls and provides optimistic updates.
 */
export function useEmailPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["emailPreferences"],
    queryFn: fetchEmailPreferences,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const mutation = useMutation({
    mutationFn: updateEmailPreferences,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["emailPreferences"] });
    },
  });

  return {
    preferences: query.data || defaultPreferences,
    isLoading: query.isLoading,
    updatePreferences: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
