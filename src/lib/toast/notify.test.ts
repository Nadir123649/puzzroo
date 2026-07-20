import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { toast } from 'react-hot-toast'
import { notify, ToastMessages, formatToast } from '@/lib/toast'

describe('messages', () => {
  it('has no empty message values', () => {
    for (const [key, value] of Object.entries(ToastMessages)) {
      expect(value, `message for ${key} must be non-empty`).toBeTruthy()
      expect(typeof value).toBe('string')
    }
  })

  it('formatToast substitutes {n} placeholders', () => {
    expect(formatToast('GAME_STREAK', { n: 5 })).toBe('Streak extended to 5 days!')
  })

  it('formatToast leaves unmatched placeholders intact', () => {
    expect(formatToast('GAME_STREAK')).toContain('{n}')
  })
})

describe('notify', () => {
  beforeEach(() => {
    vi.spyOn(toast, 'success')
    vi.spyOn(toast, 'error')
    vi.spyOn(toast, 'loading')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('successKey renders a success toast with the mapped copy', () => {
    notify.successKey('AUTH_USERNAME_SET')
    expect(toast.success).toHaveBeenCalledWith(
      ToastMessages.AUTH_USERNAME_SET,
      expect.objectContaining({ duration: 4000 })
    )
  })

  it('errorKey renders an error toast with longer duration', () => {
    notify.errorKey('AUTH_RESET_FAILED')
    expect(toast.error).toHaveBeenCalledWith(
      ToastMessages.AUTH_RESET_FAILED,
      expect.objectContaining({ duration: 6000 })
    )
  })

  it('fromResult extracts a nested payload error', () => {
    const msg = notify.fromResult({ success: false, payload: { error: 'boom' } })
    expect(msg).toBe('boom')
  })

  it('fromResult extracts a direct error', () => {
    const msg = notify.fromResult({ success: false, error: 'direct' })
    expect(msg).toBe('direct')
  })

  it('fromResult falls back to generic system message', () => {
    const msg = notify.fromResult({ success: false })
    expect(msg).toBe(ToastMessages.SYSTEM_GENERIC_ERROR)
  })

  it('fromResult hides internal error codes (no spaces) as generic', () => {
    const msg = notify.fromResult({ success: false, error: 'E123' })
    expect(msg).toBe(ToastMessages.SYSTEM_GENERIC_ERROR)
  })

  it('errorFromResult shows an error toast with extracted message', () => {
    notify.errorFromResult({ success: false, error: 'nope' })
    expect(toast.error).toHaveBeenCalledWith('nope', expect.anything())
  })
})
