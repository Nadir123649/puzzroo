import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNetworkStatus } from '@/lib/toast'

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // jsdom defaults navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    })
  })

  it('reports online initially', () => {
    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current).toBe(true)
  })

  it('flips to offline when the offline event fires', () => {
    const { result } = renderHook(() => useNetworkStatus())
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)
  })

  it('flips back online when the online event fires', () => {
    const { result } = renderHook(() => useNetworkStatus())
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })
})
