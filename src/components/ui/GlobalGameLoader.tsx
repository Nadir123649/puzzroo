'use client'

import { GameLoader } from './GameLoader'

/**
 * Global GameLoader component that should be placed in the root layout.
 * It automatically responds to the GlobalLoaderContext state.
 * This ensures smooth transitions during route navigation without unmounting.
 */
export function GlobalGameLoader() {
  return <GameLoader />
}
