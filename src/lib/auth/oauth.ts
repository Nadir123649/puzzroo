'use client'

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserPopupRedirectResolver,
  type Auth,
} from 'firebase/auth'
import { getFirebaseAuth, googleProvider, facebookProvider } from '@/lib/config/firebase-client'
import { api } from '@/lib/api/client'
import { storeAuth } from '@/lib/auth/frontend-auth'
import { notify, ToastMessages } from '@/lib/toast'

export type OAuthProvider = 'google' | 'facebook'

// Returned by signInOAuthPopup when the popup failed and we fell back to a
// full-page redirect. Callers must NOT exchange a token in this case — the
// page will reload and the mount-time redirect consumer completes the login.
export const OAUTH_REDIRECT_SENTINEL = '__puzzroo_oauth_redirect__'

// Popup flows are unreliable on storage-partitioned browsers (mobile Safari,
// ITP) and when a stale popup/redirect operation is still pending. Falling
// back to signInWithRedirect for these codes makes sign-in deterministic.
// NOTE: auth/cancelled-popup-request is deliberately NOT here — it means the
// popup request was cancelled (user closed it, or a newer popup attempt
// superseded this one via Firebase's single-popup lifecycle). Falling back to
// a redirect in that case would hijack the page mid-click and silently kill
// the fresh popup the user just opened.
const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/internal-error',
  'auth/missing-or-invalid-nonce',
  'auth/missing-initial-state',
  'auth/operation-not-supported-in-this-environment',
])

// Guards against concurrent popup operations: two simultaneous
// signInWithPopup calls invalidate each other's nonce (Google shows
// "Duplicate credentials received", Firebase throws auth/missing-or-invalid-nonce
// or auth/internal-error) and produce silent cancelled-popup-request failures.
let oauthInFlight = false

// Firebase deliberately delays its popup-closed-by-user rejection by 8s (its
// grace period for network calls still in flight), which would leave
// oauthInFlight held and the Google button dead after closing the popup.
// We detect closure via window focus instead: the popup steals focus on
// open, so the window regaining focus means it closed. (Reading
// popupWindow.closed is unreliable here — COOP separation blocks the read
// and fires console warnings.)
function onWindowFocus() {
  if (oauthInFlight) oauthInFlight = false
}

function getAuthOrThrow(): Auth {
  try {
    return getFirebaseAuth()
  } catch (err: any) {
    throw Object.assign(new Error(err?.message || 'Firebase auth unavailable'), { code: 'auth/unavailable' })
  }
}

// Popup flow (used for Google; works reliably on desktop + mobile).
// Falls back to a redirect flow whenever the popup channel fails.
export async function signInOAuthPopup(
  provider: OAuthProvider
): Promise<{ token: string; firebaseEmail?: string } | typeof OAUTH_REDIRECT_SENTINEL> {
  if (oauthInFlight) {
    // Debounce true double-clicks: the first attempt's popup is still open.
    throw Object.assign(new Error('OAuth operation already in progress'), { code: 'auth/cancelled-popup-request' })
  }
  oauthInFlight = true
  window.addEventListener('focus', onWindowFocus)
  const fp = provider === 'google' ? googleProvider! : facebookProvider!
  try {
    const result = await signInWithPopup(getAuthOrThrow(), fp, browserPopupRedirectResolver)
    const token = await result.user.getIdToken()
    const firebaseEmail = result.user.email ?? undefined
    return { token, firebaseEmail }
  } catch (err: any) {
    if (err?.code && POPUP_FALLBACK_CODES.has(err.code)) {
      // Drain any stale pending redirect state so the follow-up redirect
      // starts from a clean slate.
      getRedirectResult(getAuthOrThrow(), browserPopupRedirectResolver).catch(() => {})
      await startOAuthRedirect(provider)
      return OAUTH_REDIRECT_SENTINEL
    }
    throw err
  } finally {
    window.removeEventListener('focus', onWindowFocus)
    oauthInFlight = false
  }
}

// Redirect flow (used for Facebook — popup breaks on storage-partitioned
// mobile browsers with "missing initial state" — and as the Google fallback).
export async function startOAuthRedirect(provider: OAuthProvider): Promise<void> {
  // Mark that a redirect sign-in is on its way. The mount-time consumer uses
  // this to distinguish "redirect still completing" (retry) from "nothing
  // pending" (return immediately), and to survive React StrictMode's
  // double-mount without racing the one-shot getRedirectResult.
  try { localStorage.setItem(OAUTH_REDIRECT_SENTINEL, '1') } catch {}
  const fp = provider === 'google' ? googleProvider! : facebookProvider!
  await signInWithRedirect(getAuthOrThrow(), fp, browserPopupRedirectResolver)
}

// Dedupe concurrent consumers (StrictMode double-mount fires the effect
// twice). getRedirectResult is one-shot, so both mounts MUST share one read.
let consumePromise: Promise<{ token: string; provider: OAuthProvider; firebaseEmail?: string } | { error: unknown } | null> | null = null

// Consume a redirect result after the provider bounces the user back.
// Returns null when there is nothing pending, or the error so callers can
// surface the real cause instead of silently dropping the login.
export function consumeOAuthRedirect(): Promise<
  { token: string; provider: OAuthProvider; firebaseEmail?: string } | { error: unknown } | null
> {
  if (!consumePromise) {
    consumePromise = doConsumeOAuthRedirect().finally(() => { consumePromise = null })
  }
  return consumePromise
}

async function doConsumeOAuthRedirect() {
  const hasSentinel = typeof window !== 'undefined' && !!localStorage.getItem(OAUTH_REDIRECT_SENTINEL)
  const deadline = Date.now() + (hasSentinel ? 20_000 : 0)
  while (true) {
    let result
    try {
      result = await getRedirectResult(getAuthOrThrow(), browserPopupRedirectResolver)
    } catch (error) {
      // Definitive error (e.g. stale state) — surface it once.
      try { localStorage.removeItem(OAUTH_REDIRECT_SENTINEL) } catch {}
      return { error }
    }
    if (result?.user) {
      try { localStorage.removeItem(OAUTH_REDIRECT_SENTINEL) } catch {}
      const token = await result.user.getIdToken()
      const provider: OAuthProvider = result.providerId === 'facebook.com' ? 'facebook' : 'google'
      const firebaseEmail = result.user.email ?? undefined
      return { token, provider, firebaseEmail }
    }
    // Nothing pending and no redirect in flight → bail immediately.
    if (!hasSentinel) return null
    // Redirect in flight but result not ready yet — the roundtrip can finish
    // after first paint. Retry until the deadline.
    if (Date.now() > deadline) {
      try { localStorage.removeItem(OAUTH_REDIRECT_SENTINEL) } catch {}
      return null
    }
    await new Promise((r) => setTimeout(r, 800))
  }
}

function mapUserData(payload: any, provider: OAuthProvider, firebaseEmail?: string) {
  const u = payload.user
  // Use backend email first, fall back to Firebase email (Google always provides it via Firebase)
  const resolvedEmail = u.email || firebaseEmail || ''
  return {
    id: u.id,
    name: u.name || u.username,
    email: resolvedEmail,
    googleEmail: u.googleEmail || (provider === 'google' ? (firebaseEmail ?? null) : null),
    username: u.username,
    usernameSet: u.usernameSet,
    joinedDate: u.createdAt
      ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'N/A',
    accountStatus: u.status || 'active',
    subscriptionPlan: u.role || 'free',
    role: u.role || 'free',
    avatar: u.avatar,
    provider: u.provider || provider,
    linkedProviders: u.linkedProviders || [],
  }
}

// Exchange the Firebase ID token with our backend, persist the session, and
// navigate. Shared by the popup and redirect flows.
export async function completeOAuthLogin(
  firebaseToken: string,
  provider: OAuthProvider,
  rememberMe: boolean,
  opts: {
    setSubmitting: (v: boolean) => void
    setErrors?: (e: any) => void
    welcomeKey?: string
    router?: any
    firebaseEmail?: string
  }
) {
  opts.setSubmitting(true)
  try {
    const res = await api(`/api/v1/oauth/${provider}`, {
      method: 'POST',
      body: JSON.stringify({ firebaseToken, rememberMe }),
    })
    if (!res.success) {
      const serverErr = (res as any)?.payload?.error
      const msg = typeof serverErr?.message === 'string' ? serverErr.message : null
      if (msg) {
        notify.error(msg)
        opts.setErrors?.({ general: msg })
      } else {
        notify.errorKey('AUTH_OAUTH_FAILED')
        opts.setErrors?.({ general: ToastMessages.AUTH_OAUTH_FAILED })
      }
      opts.setSubmitting(false)
      return
    }
    const payload = res.payload as any
    const userData = mapUserData(payload, provider, opts.firebaseEmail)
    storeAuth(rememberMe, payload.token.accessToken, JSON.stringify(userData))
    window.dispatchEvent(new Event('auth-change'))
    if (opts.welcomeKey && payload.user.usernameSet) notify.successKey(opts.welcomeKey as any)
    opts.setSubmitting(false)
    if (opts.router) {
      opts.router.push(payload.user.usernameSet ? '/' : '/choose-username')
    } else {
      window.location.href = payload.user.usernameSet ? '/' : '/choose-username'
    }
  } catch (err: any) {
    opts.setSubmitting(false)
    if (err?.code !== 'auth/popup-closed-by-user') {
      notify.errorFromResult(err, 'AUTH_OAUTH_FAILED')
      opts.setErrors?.({ general: notify.fromResult(err, 'AUTH_OAUTH_FAILED') })
    }
  }
}
