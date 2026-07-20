/**
 * Typed toast wrapper for Puzzroo.
 *
 * Use this everywhere instead of importing `toast` from `react-hot-toast`
 * directly. Keeps toast copy, durations, and error extraction in one place.
 */
import toast, { type Toast, type ToastOptions } from 'react-hot-toast'
import { ToastMessages, formatToast, type ToastKey } from './messages'

const DEFAULT_DURATION = 4000
const SECURITY_DURATION = 5000
const PERSISTENT_DURATION = 6000

type ApiLike =
  | { success?: boolean; error?: string; message?: string; payload?: { error?: string; message?: string } }
  | null
  | undefined

function baseOptions(duration: number, options?: ToastOptions): ToastOptions {
  return { duration, ...options }
}

export const notify = {
  success(message: string, options?: ToastOptions): string | null {
    return toast.success(message, baseOptions(DEFAULT_DURATION, options))
  },

  error(message: string, options?: ToastOptions): string | null {
    return toast.error(message, baseOptions(PERSISTENT_DURATION, options))
  },

  info(message: string, options?: ToastOptions): string | null {
    return toast(message, baseOptions(DEFAULT_DURATION, options))
  },

  loading(message: string, options?: ToastOptions): string | null {
    return toast.loading(message, { ...options })
  },

  /**
   * Convenience for keyed success/error messages with optional `{n}` vars.
   */
  key(key: ToastKey, vars?: Record<string, string | number>, options?: ToastOptions): string | null {
    return toast(formatToast(key, vars), baseOptions(DEFAULT_DURATION, options))
  },

  successKey(key: ToastKey, vars?: Record<string, string | number>, options?: ToastOptions): string | null {
    return toast.success(formatToast(key, vars), baseOptions(DEFAULT_DURATION, options))
  },

  errorKey(key: ToastKey, vars?: Record<string, string | number>, options?: ToastOptions): string | null {
    return toast.error(formatToast(key, vars), baseOptions(PERSISTENT_DURATION, options))
  },

  infoKey(key: ToastKey, vars?: Record<string, string | number>, options?: ToastOptions): string | null {
    return toast(formatToast(key, vars), baseOptions(DEFAULT_DURATION, options))
  },

  /**
   * Extract a human-readable message from an API response / caught error.
   * Falls back to a generic system message so we never surface raw stack
   * traces or internal payloads to the user.
   */
  fromResult(result: ApiLike, fallbackKey: ToastKey = 'SYSTEM_GENERIC_ERROR'): string {
    const direct = result?.error || result?.message
    const nested = result?.payload?.error || result?.payload?.message
    const extracted = direct || nested
    if (
      extracted &&
      typeof extracted === 'string' &&
      /^[A-Z0-9_]{2,}$/.test(extracted) &&
      !/[a-z]/.test(extracted)
    ) {
      // All-caps token (e.g. "E123", "TOKEN_EXPIRED") is an internal code,
      // not a user-facing message — fall back to a generic copy.
      return formatToast(fallbackKey)
    }
    return extracted || formatToast(fallbackKey)
  },

  /**
   * Show an error toast derived from an API result.
   */
  errorFromResult(result: ApiLike, fallbackKey: ToastKey = 'SYSTEM_GENERIC_ERROR'): string | null {
    return toast.error(notify.fromResult(result, fallbackKey), baseOptions(PERSISTENT_DURATION))
  },

  /**
   * Wrap an async action with loading → success/error toasts.
   */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: unknown) => string)
    },
    options?: ToastOptions
  ): Promise<T> {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      options
    )
  },

  dismiss(id?: string) {
    toast.dismiss(id)
  },
}

export { ToastMessages, formatToast }
export type { ToastKey, Toast, ToastOptions }
