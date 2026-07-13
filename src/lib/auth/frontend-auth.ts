/**
 * Frontend-only Authentication System
 * 
 * This is NOT real authentication - for presentation and testing only.
 * Uses localStorage to persist login state.
 */

export interface User {
  id: string
  name: string
  email: string
  username: string
  joinedDate: string
  accountStatus: 'active' | 'inactive'
  subscriptionPlan: 'free' | 'monthly' | 'yearly' | 'lifetime'
  avatar?: string
}  

// Mock user data
const MOCK_USER: User = {
  id: '69f9e8eaacc567cc2a27db28',
  name: 'Abdul Raheem',
  email: 'abdulraheem55jutt@gmail.com',
  username: 'abdulraheem',
  joinedDate: '5 May 2026',
  accountStatus: 'active',
  subscriptionPlan: 'free',
}

// Development credentials
const DEV_CREDENTIALS = {
  email: 'abdulraheem55jutt@gmail.com',
  password: 'Password123',
}

const AUTH_PASSWORD_KEY = 'puzzroo_dev_password'
const AUTH_STORAGE_KEY = 'puzzroo_auth'
const USER_STORAGE_KEY = 'puzzroo_user'

/**
 * Get current stored password
 */
export function getStoredPassword(): string {
  if (typeof window === 'undefined') return DEV_CREDENTIALS.password
  return localStorage.getItem(AUTH_PASSWORD_KEY) || DEV_CREDENTIALS.password
}

/**
 * Validate login credentials
 */
export function validateLogin(email: string, password: string): boolean {
  return email === DEV_CREDENTIALS.email && password === getStoredPassword()
}

/**
 * Change user password
 */
export function changePassword(oldPassword: string, newPassword: string): { success: boolean; error?: string } {
  if (oldPassword !== getStoredPassword()) {
    return {
      success: false,
      error: 'Incorrect current password',
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_PASSWORD_KEY, newPassword)
  }
  return { success: true }
}

/**
 * Login user and store session
 */
export function login(email: string, password: string): { success: boolean; error?: string } {
  if (!validateLogin(email, password)) {
    return {
      success: false,
      error: 'Invalid email or password',
    }
  }

  // Store auth state
  localStorage.setItem(AUTH_STORAGE_KEY, 'true')
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(MOCK_USER))

  // Store last login info
  const loginInfo = {
    lastLogin: new Date().toISOString(),
    device: getDeviceInfo(),
    location: 'PK', // Mock location
  }
  localStorage.setItem('puzzroo_login_info', JSON.stringify(loginInfo))

  // Dispatch auth-change event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-change'))
  }

  return { success: true }
}

/**
 * Logout user and clear session
 */
export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
  localStorage.removeItem('puzzroo_login_info')

  // Dispatch auth-change event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-change'))
  }
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true'
}

/**
 * Get current user data
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  
  const userStr = localStorage.getItem(USER_STORAGE_KEY)
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Update user data
 */
export function updateUser(updates: Partial<User>): boolean {
  const currentUser = getCurrentUser()
  if (!currentUser) return false

  const updatedUser = { ...currentUser, ...updates }
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
  return true
}

/**
 * Get device info for login tracking
 */
function getDeviceInfo(): string {
  const ua = navigator.userAgent
  let browser = 'Unknown'
  let version = ''

  if (ua.indexOf('Chrome') > -1) {
    browser = 'Chrome'
    version = ua.match(/Chrome\/(\d+)/)?.[1] || ''
  } else if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox'
    version = ua.match(/Firefox\/(\d+)/)?.[1] || ''
  } else if (ua.indexOf('Safari') > -1) {
    browser = 'Safari'
    version = ua.match(/Version\/(\d+)/)?.[1] || ''
  } else if (ua.indexOf('Edge') > -1) {
    browser = 'Edge'
    version = ua.match(/Edge\/(\d+)/)?.[1] || ''
  }

  const os = ua.indexOf('Windows') > -1 ? 'Windows' : 
             ua.indexOf('Mac') > -1 ? 'Mac' : 
             ua.indexOf('Linux') > -1 ? 'Linux' : 'Unknown'

  return `${browser}${version ? ' ' + version : ''} - ${os}`
}

/**
 * Get last login information
 */
export function getLastLoginInfo(): { lastLogin: string; device: string; location: string } | null {
  if (typeof window === 'undefined') return null
  
  const infoStr = localStorage.getItem('puzzroo_login_info')
  if (!infoStr) return null

  try {
    const info = JSON.parse(infoStr)
    return {
      lastLogin: formatDate(info.lastLogin),
      device: info.device,
      location: info.location,
    }
  } catch {
    return null
  }
}

/**
 * Format date for display
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  const day = date.getDate()
  const month = date.toLocaleString('en', { month: 'short' })
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}
