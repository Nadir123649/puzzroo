/**
 * Centralized toast message copy for Puzzroo.
 *
 * All user-facing toast strings live here so they stay consistent,
 * reviewable, and easy to localize. Never inline raw strings at call sites —
 * reference a key from `ToastMessages`.
 *
 * Key prefixes:
 *   AUTH_*     authentication / account auth flows
 *   ACCOUNT_*  profile & account management
 *   GAME_*     gameplay feedback (solve, hints, errors, autosave)
 *   BILLING_*  subscription & payments
 *   NETWORK_*  connectivity
 *   SYSTEM_*   generic app / error states
 */

export const ToastMessages = {
  // ---- Auth ----
  AUTH_USERNAME_SET: 'Username set! Welcome to Puzzroo.',
  AUTH_EMAIL_VERIFIED: 'Email verified! You can now log in.',
  AUTH_VERIFY_INVALID: 'Verification link invalid or expired.',
  AUTH_WELCOME_BACK: 'Welcome back!',
  AUTH_WELCOME_OAUTH: 'Welcome!',
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_OAUTH_FAILED: 'Social login failed. Please try again.',
  AUTH_SIGNUP_SUCCESS: 'Account created! Check your email for verification.',
  AUTH_SIGNUP_FAILED: 'Registration failed. Please try again.',
  AUTH_USERNAME_INVALID: 'Username can only use lowercase letters, numbers, . _ or -',
  AUTH_RESET_SUCCESS: 'Password reset successful!',
  AUTH_RESET_FAILED: 'Failed to reset password. Please try again.',
  AUTH_LOGOUT_SUCCESS: 'You have been logged out.',

  // ---- Account ----
  ACCOUNT_DELETED: 'Your account has been deleted.',
  ACCOUNT_DELETE_FAILED: 'Failed to delete account.',
  ACCOUNT_DELETE_FAILED_RETRY: 'Failed to delete account. Please try again.',
  ACCOUNT_RESET_LINK_SENT: 'Password reset link sent to your email.',
  ACCOUNT_RESET_EMAIL_FAILED: 'Failed to send reset email.',
  ACCOUNT_RESET_EMAIL_FAILED_RETRY: 'Failed to send reset email. Please try again.',
  ACCOUNT_NAME_UPDATED: 'Display name updated.',
  ACCOUNT_PREFS_SAVED: 'Email preferences saved.',
  ACCOUNT_AVATAR_UPLOADED: 'Profile picture updated.',
  ACCOUNT_AVATAR_FAILED: 'Could not upload profile picture. Please try again.',

  // ---- Gameplay ----
  GAME_SOLVED: 'Solved! Nicely done.',
  GAME_SOLVED_DAILY: 'Daily challenge complete!',
  GAME_NEW_BEST: 'New personal best!',
  GAME_STREAK: 'Streak extended to {n} days!',
  GAME_HINT_USED: 'Hint revealed.',
  GAME_NO_HINTS_LEFT: 'No hints remaining.',
  GAME_INVALID_MOVE: 'That move is not allowed.',
  GAME_WRONG_ENTRY: 'That does not look right.',
  GAME_PROGRESS_SAVED: 'Progress saved.',
  GAME_NOTHING_TO_UNDO: 'Nothing to undo.',

  // ---- Billing ----
  BILLING_CHECKOUT_STARTED: 'Redirecting to checkout…',
  BILLING_ACTIVATED: 'Subscription activated. Enjoy Puzzroo Pro!',
  BILLING_FAILED: 'Payment failed. Please try another method.',
  BILLING_CANCELLED: 'Your subscription has been cancelled.',
  BILLING_RESUMED: 'Your subscription is active again.',
  BILLING_CARD_EXPIRING: 'Your payment method is expiring soon.',

  // ---- Network ----
  NETWORK_OFFLINE: "You're offline. We'll reconnect automatically.",
  NETWORK_ONLINE: 'Back online.',

  // ---- System ----
  SYSTEM_GENERIC_ERROR: 'Something went wrong. Please try again.',
  SYSTEM_RATE_LIMITED: 'Too many attempts. Please slow down and retry.',
  SYSTEM_SESSION_EXPIRED: 'Your session expired. Please log in again.',
  SYSTEM_COPIED: 'Copied to clipboard!',
} as const

export type ToastKey = keyof typeof ToastMessages

/**
 * Render a message, substituting `{n}`-style placeholders.
 */
export function formatToast(key: ToastKey, vars?: Record<string, string | number>): string {
  let msg: string = ToastMessages[key]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return msg
}
