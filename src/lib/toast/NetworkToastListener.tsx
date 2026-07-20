'use client'

import { useEffect, useRef } from 'react'
import { useNetworkStatus } from './useNetworkStatus'
import { notify } from './notify'

/**
 * Listens for connectivity changes and shows offline / back-online toasts.
 * Mount once near the app root (inside ThemeProvider in layout.tsx).
 */
export function NetworkToastListener() {
  const online = useNetworkStatus()
  const mounted = useRef(false)
  const wasOnline = useRef(online)

  useEffect(() => {
    // Skip the initial render so we don't toast on first load.
    if (!mounted.current) {
      mounted.current = true
      wasOnline.current = online
      return
    }

    if (wasOnline.current && !online) {
      notify.errorKey('NETWORK_OFFLINE')
    } else if (!wasOnline.current && online) {
      notify.successKey('NETWORK_ONLINE')
    }
    wasOnline.current = online
  }, [online])

  return null
}
