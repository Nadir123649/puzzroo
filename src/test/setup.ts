import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { toast } from 'react-hot-toast'

// Reset DOM and any rendered toasts between tests.
afterEach(async () => {
  cleanup()
  toast.dismiss()
  await new Promise((resolve) => setTimeout(resolve, 0))
})

// jsdom doesn't implement matchMedia; stub it for components that use it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
