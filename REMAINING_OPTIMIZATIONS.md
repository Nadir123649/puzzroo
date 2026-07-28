# Remaining API Optimizations

## Quick Implementation Guide

These are **optional but recommended** optimizations to complete the API deduplication across the entire app.

---

## 1. Account Information Page

**File**: `src/app/(dashboard)/account-information/page.tsx`

### Current Issues:
- Calls `fetchGameStats()` on mount - not cached
- Calls `fetchSessions()` on mount - not cached  
- Calls `fetchUserProfile()` on mount - duplicate of user data
- Uses `getCurrentUser()` which reads from localStorage instead of cache

### Solution:
Create React Query hooks and update the page.

#### Step 1: Create useGameStats hook

**File**: `src/hooks/useGameStats.ts` (NEW)
```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

async function fetchGameStats() {
  try {
    const res = await api("/api/v1/games/stats");
    if (!res.success) return null;
    return res.payload;
  } catch {
    return null;
  }
}

export function useGameStats() {
  return useQuery({
    queryKey: ["gameStats"],
    queryFn: fetchGameStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
```

#### Step 2: Create useSessions hook

**File**: `src/hooks/useSessions.ts` (NEW)
```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

async function fetchSessions() {
  try {
    const res = await api("/api/v1/sessions");
    if (!res.success) return [];
    return (res.payload as any) || [];
  } catch {
    return [];
  }
}

async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    const res = await api(`/api/v1/sessions/${sessionId}`, { method: "DELETE" });
    return res.success;
  } catch {
    return false;
  }
}

export function useSessions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sessions"],
    queryFn: fetchSessions,
    staleTime: 2 * 60 * 1000, // 2 minutes (sessions change frequently)
    refetchOnWindowFocus: false,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  return {
    sessions: query.data || [],
    isLoading: query.isLoading,
    revokeSession: revokeMutation.mutateAsync,
    isRevoking: revokeMutation.isPending,
  };
}
```

#### Step 3: Update Account Information Page

In `src/app/(dashboard)/account-information/page.tsx`:

**Replace imports:**
```typescript
// REMOVE:
import { getCurrentUser, fetchGameStats, fetchSessions, revokeSession, fetchUserProfile } from '@/lib/auth/frontend-auth'

// ADD:
import { useUser } from '@/hooks/useUser'
import { useGameStats } from '@/hooks/useGameStats'
import { useSessions } from '@/hooks/useSessions'
```

**Replace state and effects:**
```typescript
// REMOVE:
const [localUser, setLocalUser] = useState(getCurrentUser())
const [gameStats, setGameStats] = useState<any>(null)
const [sessions, setSessions] = useState<SessionDevice[]>([])
const [sessionsLoading, setSessionsLoading] = useState(true)

useEffect(() => {
  fetchGameStats().then(setGameStats)
  fetchSessions().then(s => {
    setSessions(s)
    setSessionsLoading(false)
  })
  fetchUserProfile().then(profile => {
    // ...
  })
}, [])

// ADD:
const { data: localUser } = useUser()
const { data: gameStats } = useGameStats()
const { sessions, isLoading: sessionsLoading, revokeSession: revokeMutation } = useSessions()
```

**Update revokeSession handler:**
```typescript
// REPLACE:
const handleRevokeSession = async (id: string) => {
  const ok = await revokeSession(id)
  if (ok) {
    setSessions(prev => prev.filter(s => s.id !== id))
    // ...
  }
}

// WITH:
const handleRevokeSession = async (id: string) => {
  const wasCurrent = sessions.find(s => s.id === id)?.isCurrent
  const ok = await revokeMutation(id)
  if (ok && wasCurrent) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('puzzroo_auth')
    localStorage.removeItem('puzzroo_user')
    window.location.href = '/login'
  }
}
```

**Impact**: Eliminates 3 duplicate API calls on account information page load.

---

## 2. Billing History Page

**File**: `src/app/(dashboard)/billing-history/page.tsx`

### Current Issues:
- Uses `getCurrentUser()` instead of cached user data
- Calls `fetchBillingHistory()` without caching

### Solution:

#### Step 1: Create useBillingHistory hook

**File**: `src/hooks/useBillingHistory.ts` (NEW)
```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

async function fetchBillingHistory() {
  try {
    const res = await api("/api/v1/billing/history");
    if (!res.success) return null;
    return res.payload;
  } catch {
    return null;
  }
}

export function useBillingHistory() {
  return useQuery({
    queryKey: ["billingHistory"],
    queryFn: fetchBillingHistory,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
```

#### Step 2: Update Billing History Page

Replace:
```typescript
// REMOVE:
const user = getCurrentUser()
const [billingData, setBillingData] = useState<any>(null)
useEffect(() => {
  fetchBillingHistory().then(setBillingData)
}, [])

// ADD:
const { data: user } = useUser()
const { data: billingData, isLoading } = useBillingHistory()
```

---

## 3. Subscription Page

**File**: `src/app/(dashboard)/subscription/page.tsx`

Similar to billing history - if it calls `fetchSubscription()`, create `useSubscription()` hook.

---

## 4. Admin Tracking Page

**File**: `src/app/(dashboard)/admin/tracking/page.tsx`

### Current Issues:
- Uses `getCurrentUser()` to check admin role

### Solution:
```typescript
// REPLACE:
const u = getCurrentUser()
if (!u || u.role !== 'admin') {
  router.replace('/account-information')
}

// WITH:
const { data: user } = useUser()
useEffect(() => {
  if (!user || user.role !== 'admin') {
    router.replace('/account-information')
  }
}, [user, router])
```

---

## 5. Past Puzzles Content

**File**: `src/components/past-puzzles/PastPuzzlesContent.tsx`

### Current Issues:
- Calls `getCurrentUser()` multiple times

### Solution:
```typescript
// REPLACE:
const user = getCurrentUser()

// WITH:
const { data: user } = useUser()
```

---

## 6. Navbar Component

**File**: `src/components/layout/navbar.tsx`

### Current Issues:
- Calls `getCurrentUser()` on mount and auth changes

### Solution:
```typescript
// REPLACE:
const [user, setUser] = useState<{ name: string; email: string } | null>(() => {
  if (typeof window === 'undefined' || !globalMounted) return null
  const userData = getCurrentUser()
  if (!userData) return null
  return { name: userData.name || userData.username, email: userData.email }
})

// WITH:
const { data: userData } = useUser()
const user = userData ? {
  name: userData.name || userData.username,
  email: userData.email
} : null
```

Then remove the useEffect that syncs user on auth-change - React Query will handle it.

---

## Priority Order

### High Priority (Do First):
1. ✅ Email Preferences Page - **DONE**
2. Account Information Page - 3 API calls saved
3. Navbar Component - Used on every page

### Medium Priority:
4. Billing History Page
5. Past Puzzles Content
6. Admin pages

### Low Priority:
- Any remaining pages using `getCurrentUser()` or `fetch*()` functions

---

## Testing Each Update

After each change:
1. Open Network tab in browser DevTools
2. Navigate to the updated page
3. Check that API calls happen ONCE, not twice
4. Navigate away and back - should use cache
5. Wait 5 minutes, refresh - should refetch

---

## Quick Find & Replace

To find all files that need updating:

### Search for:
```bash
# Find getCurrentUser() usage
grep -r "getCurrentUser()" src/

# Find fetch* function calls
grep -r "fetchGameStats\|fetchSessions\|fetchBillingHistory\|fetchSubscription" src/
```

### Pattern to look for:
```typescript
// BAD (needs fixing):
const user = getCurrentUser()
const [data, setData] = useState(null)
useEffect(() => {
  fetchSomething().then(setData)
}, [])

// GOOD (after fix):
const { data: user } = useUser()
const { data, isLoading } = useSomething()
```

---

## Verification

After all optimizations:

1. Open any page → Should see minimal API calls
2. Navigate to another page → Should see only necessary calls
3. Go back → Should use cache (0 API calls)
4. Check Network tab → No duplicate calls
5. Wait 5 minutes → Data refetches only if page is active

**Expected Result**: 
- Landing page: Only `/api/v1/track` (analytics)
- Dashboard pages: Only new data requests, user/preferences cached
- Back navigation: Zero API calls (uses cache)

---

## Summary

By implementing these hooks, you will:
- ✅ Eliminate all duplicate API calls
- ✅ Add intelligent caching across the app
- ✅ Improve page load performance
- ✅ Reduce server load significantly
- ✅ Better user experience (instant back navigation)

All hooks follow the same pattern - easy to implement and maintain.
