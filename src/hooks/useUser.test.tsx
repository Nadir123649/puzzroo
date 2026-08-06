import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { useUser } from '@/hooks/useUser'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api/client', () => ({ api: apiMock }))

vi.mock('@/lib/auth/frontend-auth', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/auth/frontend-auth')>()
  return {
    ...mod,
    getAccessToken: () => 'test-token',
    hasStoredAuth: () => true,
  }
})

function ProfileProbe() {
  const { data } = useUser()
  return <div data-testid="profile-name">{data ? data.name : 'null'}</div>
}

function renderProbe() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ProfileProbe />
    </QueryClientProvider>
  )
  return { queryClient, ...utils }
}

const meResponse = (name: string) => ({
  success: true,
  payload: {
    id: 'u1',
    publicId: 'pub1',
    name,
    username: name,
    email: 'a@b.com',
    createdAt: new Date().toISOString(),
    role: 'free',
  },
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('useUser profile sync across devices', () => {
  it('refetches profile on window focus so changes made on another device appear', async () => {
    apiMock.mockResolvedValue(meResponse('OldName'))
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('profile-name').textContent).toBe('OldName'))

    // Simulate: another device changed the name on the server while this tab
    // stayed open. jsdom starts focused and stays focused, so drive the real
    // blur→focus transition through react-query's focus manager (this is what
    // fires when a browser tab regains focus).
    apiMock.mockResolvedValue(meResponse('NewName'))
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    await waitFor(() => expect(screen.getByTestId('profile-name').textContent).toBe('NewName'), {
      timeout: 3000,
    })
  })
})
