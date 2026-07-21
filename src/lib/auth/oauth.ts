'use client'

import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { auth, googleProvider, facebookProvider } from '@/lib/config/firebase-client'
import { api } from '@/lib/api/client'
import { notify, ToastMessages } from '@/lib/toast'

export type OAuthProvider = 'google' | 'facebook'

// Popup flow (used for Google; works reliably on desktop + mobile).
export async function signInOAuthPopup(provider: OAuthProvider): Promise<string> {
  const fp = provider === 'google' ? googleProvider! : facebookProvider!
  const result = await signInWithPopup(auth!, fp)
  return result.user.getIdToken()
}

// Redirect flow (used for Facebook — popup breaks on storage-partitioned
// mobile browsers with "missing initial state").
export async function startOAuthRedirect(provider: OAuthProvider): Promise<void> {
  const fp = provider === 'google' ? googleProvider! : facebookProvider!
  await signInWithRedirect(auth!, fp)
}

// Consume a redirect result after the provider bounces the user back.
export async function consumeOAuthRedirect(): Promise<{ token: string; provider: OAuthProvider } | null> {
  try {
    const result = await getRedirectResult(auth!)
    if (!result || !result.user) return null
    const token = await result.user.getIdToken()
    const provider: OAuthProvider = result.providerId === 'facebook.com' ? 'facebook' : 'google'
    return { token, provider }
  } catch {
    return null
  }
}

function mapUserData(payload: any, provider: OAuthProvider) {
  const u = payload.user
  return {
    id: u.id,
    name: u.name || u.username,
    email: u.email || '',
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
  }
) {
  opts.setSubmitting(true)
  try {
    const res = await api(`/api/v1/oauth/${provider}`, {
      method: 'POST',
      body: JSON.stringify({ firebaseToken, rememberMe }),
    })
    if (!res.success) {
      notify.errorKey('AUTH_OAUTH_FAILED')
      opts.setErrors?.({ general: ToastMessages.AUTH_OAUTH_FAILED })
      opts.setSubmitting(false)
      return
    }
    const payload = res.payload as any
    const userData = mapUserData(payload, provider)
    localStorage.setItem('accessToken', payload.token.accessToken)
    localStorage.setItem('puzzroo_auth', 'true')
    localStorage.setItem('puzzroo_user', JSON.stringify(userData))
    window.dispatchEvent(new Event('auth-change'))
    if (opts.welcomeKey) notify.successKey(opts.welcomeKey as any)
    opts.setSubmitting(false)
    window.location.href = payload.user.usernameSet ? '/' : '/choose-username'
  } catch (err: any) {
    opts.setSubmitting(false)
    if (err?.code !== 'auth/popup-closed-by-user') {
      notify.errorFromResult(err, 'AUTH_OAUTH_FAILED')
      opts.setErrors?.({ general: notify.fromResult(err, 'AUTH_OAUTH_FAILED') })
    }
  }
}
