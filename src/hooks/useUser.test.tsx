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

function setPathname(path: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, pathname: path },
    writable: true,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  setPathname('/')
})

describe('useUser network policy', () => {
  it('fetches profile once when the home page opens', async () => {
    apiMock.mockResolvedValue(meResponse('OldName'))
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('profile-name').textContent).toBe('OldName'))
    expect(apiMock).toHaveBeenCalledTimes(1)
    expect(apiMock).toHaveBeenCalledWith('/api/v1/users/me')
  })

  it('never refetches on window focus (no background API calls)', async () => {
    apiMock.mockResolvedValue(meResponse('OldName'))
    renderProbe()
    await waitFor(() => expect(screen.getByTestId('profile-name').textContent).toBe('OldName'))

    apiMock.mockResolvedValue(meResponse('NewName'))
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })

    // Give a potential (undesired) refetch time to fire.
    await new Promise((r) => setTimeout(r, 300))
    expect(screen.getByTestId('profile-name').textContent).toBe('OldName')
    expect(apiMock).toHaveBeenCalledTimes(1)
  })

  it('does not fetch on non-home pages', async () => {
    setPathname('/sudoku')
    apiMock.mockResolvedValue(meResponse('AnyName'))
    renderProbe()

    await new Promise((r) => setTimeout(r, 300))
    expect(screen.getByTestId('profile-name').textContent).toBe('null')
    expect(apiMock).not.toHaveBeenCalled()
  })
})
