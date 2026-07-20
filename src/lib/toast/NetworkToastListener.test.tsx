import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Toaster } from 'react-hot-toast'
import { NetworkToastListener, ToastMessages } from '@/lib/toast'

function renderWithToaster(ui: React.ReactNode) {
  return render(
    <>
      <Toaster />
      {ui}
    </>
  )
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 10))

describe('NetworkToastListener', () => {
  it('shows an offline toast when connectivity is lost', async () => {
    renderWithToaster(<NetworkToastListener />)
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
      await tick()
    })
    expect(screen.getByText(ToastMessages.NETWORK_OFFLINE)).toBeInTheDocument()
  })

  it('shows a back-online toast after reconnecting', async () => {
    renderWithToaster(<NetworkToastListener />)
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
      await tick()
    })
    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await tick()
    })
    expect(screen.getByText(ToastMessages.NETWORK_ONLINE)).toBeInTheDocument()
  })
})
