"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export interface EmailPreference {
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
    return defaultPreferences.map(pref => {
      const key = pref.id === 'daily-challenge' ? 'dailyChallenge' : pref.id;
      return {
        ...pref,
        enabled: data[key] ?? pref.enabled
      };
    });
  } catch {
    return defaultPreferences;
  }
}

async function updateEmailPreferences(prefs: Record<string, boolean>): Promise<boolean> {
  const mappedPrefs: Record<string, boolean> = {};
  for (const key in prefs) {
    if (key === 'daily-challenge') {
      mappedPrefs.dailyChallenge = prefs[key];
    } else {
      mappedPrefs[key] = prefs[key];
    }
  }

  try {
    const res = await api("/api/v1/preferences", {
      method: "PATCH",
      body: JSON.stringify(mappedPrefs),
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
    onMutate: async (newPrefs) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["emailPreferences"] });

      // Snapshot the previous value
      const previousPrefs = queryClient.getQueryData<EmailPreference[]>(["emailPreferences"]);

      // Optimistically update to the new value
      queryClient.setQueryData<EmailPreference[]>(["emailPreferences"], (old) => {
        if (!old) return old;
        return old.map((pref) => {
          if (newPrefs[pref.id] !== undefined) {
            return { ...pref, enabled: newPrefs[pref.id] };
          }
          return pref;
        });
      });

      // Return a context object with the snapshotted value
      return { previousPrefs };
    },
    onError: (err, newPrefs, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPrefs) {
        queryClient.setQueryData(["emailPreferences"], context.previousPrefs);
      }
    },
    onSettled: () => {
      // Don't invalidate immediately to avoid race conditions. 
      // It will refetch when it expires.
    },
  });

  return {
    preferences: query.data || defaultPreferences,
    isLoading: query.isLoading,
    updatePreferences: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
