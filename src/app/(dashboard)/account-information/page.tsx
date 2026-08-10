'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal'
import { ChangeNameModal } from '@/components/account/ChangeNameModal'
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal'
import { SetEmailModal } from '@/components/account/SetEmailModal'
import { AvatarUpload } from '@/components/account/AvatarUpload'
import { getCurrentUser, deleteAccount, fetchGameStats, fetchSessions, revokeSession, fetchUserProfile, unlinkProvider, setAuthUser, clearAuthState, refreshUserProfile } from '@/lib/auth/frontend-auth'
import { api } from '@/lib/api/client'
import { getLocationAttestation } from '@/lib/client/browserIp'
import { notify } from '@/lib/toast'
import { Check, Activity, BarChart3, Monitor, Smartphone, Tablet, MapPin, Laptop, Trash2, Clock, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { images } from '@/lib/utils'

const PROVIDER_META: Record<string, { label: string; badge: string; badgeClass: string }> = {
  google: { label: 'Google', badge: 'G', badgeClass: 'text-[#4285F4]' },
  facebook: { label: 'Facebook', badge: 'f', badgeClass: 'text-[#1877F2]' },
  email: { label: 'Email', badge: 'mail', badgeClass: 'text-[#6949FF]' },
  phone: { label: 'Phone Number', badge: 'phone', badgeClass: 'text-[#22C55E]' },
  guest: { label: 'Guest', badge: '?', badgeClass: 'text-[#757575]' },
}

interface SessionDevice {
  id: string
  browser: string
  os: string
  deviceType: string
  location: string
  loginTime: string
  lastSeen: string
  isCurrent: boolean
  provider?: string
}

function formatSessionTime(dateStr: string) {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  
  if (diffMin < 1) return `Just now`
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago, ${timeStr}`
  
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs} ${diffHrs === 1 ? 'hour' : 'hours'} ago, ${timeStr}`
  
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays === 1) return `Yesterday at ${timeStr}`
  if (diffDays < 7) return `${diffDays} days ago, ${timeStr}`
  
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${timeStr}`
}

export default function AccountInformationPage() {
  const [localUser, setLocalUser] = useState(getCurrentUser())
  const [gameStats, setGameStats] = useState<any>(null)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionDevice[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(localUser?.provider || null)
  const [linkedProviders, setLinkedProviders] = useState<string[]>(localUser?.linkedProviders || [])
  
  // Compute canChangePassword reactively from localUser state
  const canChangePassword = !!localUser?.hasPassword

  let currentSessionProvider = sessions.find(s => s.isCurrent)?.provider || provider
  if (currentSessionProvider && linkedProviders.length > 0 && !linkedProviders.includes(currentSessionProvider)) {
    currentSessionProvider = provider
  }

  const canUnlink = linkedProviders.length >= 2
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null)

  const handleUnlinkProvider = async (providerToUnlink: string) => {
    const result = await unlinkProvider(providerToUnlink)
    if (result.success) {
      setLinkedProviders(prev => prev.filter(p => p !== providerToUnlink))
      notify.success(`${providerToUnlink === 'email' ? 'Email' : providerToUnlink.charAt(0).toUpperCase() + providerToUnlink.slice(1)} has been unlinked`)
      fetchUserProfile().then(profile => {
        if (profile) {
          if (profile.linkedProviders?.length) setLinkedProviders(profile.linkedProviders)
          if (profile.provider) setProvider(profile.provider)
        }
      })
    } else {
      notify.error(result.error || 'Failed to unlink provider')
    }
  }

  const handleNameChanged = (newName: string) => {
    const stored = getCurrentUser()
    if (stored) {
      stored.name = newName
      setAuthUser(JSON.stringify(stored))
      window.dispatchEvent(new Event('auth-change'))
    }
    setLocalUser(prev => prev ? { ...prev, name: newName } : prev)
  }

  const handleAvatarChanged = (url: string | null) => {
    const stored = getCurrentUser()
    if (stored) {
      stored.avatar = url
      setAuthUser(JSON.stringify(stored))
      window.dispatchEvent(new Event('auth-change'))
    }
    setLocalUser(prev => prev ? { ...prev, avatar: url } : prev)
  }

  const fetchedRef = useRef(false)

  useEffect(() => {
    const handleAuthChange = () => {
      const updated = getCurrentUser()
      if (updated) setLocalUser(updated)
    }
    window.addEventListener('auth-change', handleAuthChange)
    return () => window.removeEventListener('auth-change', handleAuthChange)
  }, [])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    // Pull the server profile (name, avatar) so changes made on other devices
    // are reflected here; the localStorage snapshot can lag behind.
    refreshUserProfile().then(profile => {
      if (profile) setLocalUser(prev => (prev ? { ...prev, ...profile } : profile))
    })

    fetchGameStats().then(setGameStats)
    fetchSessions().then(s => {
      setSessions(s)
      setSessionsLoading(false)
    })

    // Show the user's current location (stored GPS, else IP approximation).
    // Silent one-shot GET — no permission prompt, never auto-fires GPS.
    getLocationAttestation().then(attest =>
      api<{ [k: string]: any }>('/api/v1/location', { suppressToast: true, headers: { ...attest } })
    ).then(res => {
      if (res.success) {
        const p = res.payload
        if (p && typeof p.latitude === 'number' && typeof p.longitude === 'number') {
          const label = [p.city, p.country].filter(Boolean).join(', ') || p.region || null
          setCurrentLocation(label)
        }
      }
    })
  }, [])

  const handleRevokeSession = async (id: string) => {
    const ok = await revokeSession(id)
    if (ok) {
      setSessions(prev => prev.filter(s => s.id !== id))
      // If the revoked session was the current one, log out
      const wasCurrent = sessions.find(s => s.id === id)?.isCurrent
      if (wasCurrent) {
        clearAuthState()
        window.location.href = '/login'
      }
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return Laptop
      case 'mobile':
        return Smartphone
      case 'tablet':
        return Tablet
      default:
        return Monitor
    }
  }

  return (
    <div>
      {/* Avatar Section */}
      <div className="mb-6">
        <AvatarUpload
          currentAvatar={localUser?.avatar}
          userName={localUser?.name || ''}
          onAvatarChanged={handleAvatarChanged}
        />
      </div>

      {/* Account Details Card */}
      <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-4 mb-4">
        <h2 className="font-urbanist font-bold text-[18px] md:text-[20px] text-[#212121] dark:text-white mb-4">
          Account Details
        </h2>

        <div className="flex flex-col">
          {/* Name */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-2 sm:mb-0">
              Name
            </span>
            <div className="flex items-center gap-3">
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                {localUser?.name || 'N/A'}
              </span>
              <Button 
                size="xs"
                onClick={() => setIsNameModalOpen(true)}
              >
                Change
              </Button>
            </div>
          </div>

          {/* Joined Since */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
              Joined Since
            </span>
            <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
              {localUser?.joinedDate || 'N/A'}
            </span>
          </div>

          {/* Account ID */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
              Account ID
            </span>
            <span className="font-urbanist font-mono text-[12px] text-[#212121] dark:text-white break-all">
              {localUser?.publicId || localUser?.id || 'N/A'}
            </span>
          </div>

          {/* Account Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
              Account Status
            </span>
            <span className="font-urbanist font-semibold text-[14px] text-green-600 dark:text-green-400 capitalize">
              {localUser?.accountStatus || 'Active'}
            </span>
          </div>

          {/* Username */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-2 sm:mb-0">
              Username
            </span>
            <div className="flex flex-col items-start sm:items-end justify-center">
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                {localUser?.username || 'N/A'}
              </span>
              <span className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD] mt-0.5">
                Username cannot be changed
              </span>
            </div>
          </div>

          {/* Email Address */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
              Email Address
            </span>
            <div className="flex flex-col items-start sm:items-end">
              {localUser?.email && localUser?.email !== 'N/A' ? (
                <>
                  <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white break-all">
                    {localUser.email}
                  </span>
                  {localUser?.isVerified || (localUser?.provider === 'google' && !localUser?.hasPassword) ? (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Check size={12} className="text-green-600 dark:text-green-400" strokeWidth={3} />
                      <span className="font-urbanist text-[11px] text-green-600 dark:text-green-400 font-semibold">
                        Verified
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-urbanist text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        Not Verified
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setIsEmailModalOpen(true)}
                    className="mt-1 font-urbanist font-semibold text-[11px] text-[#6949FF] hover:underline"
                  >
                    Change Email
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="font-urbanist font-semibold text-[14px] text-[#6949FF] hover:underline"
                >
                  Set Email
                </button>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-row items-center justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD]">
              Password
            </span>
            <div className="flex items-center gap-3">
              {canChangePassword ? (
                <Button
                  size="xs"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  Change
                </Button>
              ) : (
                <Button
                  size="xs"
                  onClick={() => {
                    const hasEmail = !!(localUser?.email && localUser.email !== 'N/A' && localUser.email.trim() !== '')
                    if (!hasEmail) {
                      notify.error('Please set your email first.')
                      return
                    }
                    setIsPasswordModalOpen(true)
                  }}
                >
                  Set Password
                </Button>
              )}
            </div>
          </div>

          {/* Subscription Plan */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
              Subscription Plan
            </span>
            <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white capitalize">
              {localUser?.subscriptionPlan || 'Free'}
            </span>
          </div>

          {/* Connected Accounts */}
          <div className="pt-1 pb-3">
            <h3 className="font-urbanist font-bold text-[14px] text-[#212121] dark:text-white mb-2">
              Connected Accounts
            </h3>
            <div className="space-y-2">
              {(linkedProviders.length > 0 ? linkedProviders : (provider ? [provider] : ['email'])).map(p => {
                const meta = PROVIDER_META[p] || PROVIDER_META.email
                const isCurrent = currentSessionProvider === p
                return (
                  <div key={p} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-[#181A20] rounded-xl max-w-sm">
                    <div className="w-8 h-8 bg-white dark:bg-[#1F222A] rounded-lg flex items-center justify-center border border-gray-100 dark:border-gray-800">
                      {p === 'google' ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      ) : p === 'facebook' ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
                        </svg>
                      ) : p === 'email' ? (
                        <Image 
                          src={images.gmailIcon} 
                          alt="Gmail" 
                          width={16} 
                          height={16}
                          className="object-contain"
                        />
                      ) : meta.badge === 'phone' ? (
                        <Phone size={16} className={meta.badgeClass} strokeWidth={2.5} />
                      ) : (
                        <span className={`text-[16px] font-extrabold ${meta.badgeClass}`}>{meta.badge}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white truncate block">
                        {meta.label}
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Check size={12} className="text-green-600 dark:text-green-400" strokeWidth={3} />
                        <span className="font-urbanist text-[11px] text-green-600 dark:text-green-400 font-semibold">
                          Connected
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded font-urbanist font-bold text-[9px] text-green-600 dark:text-green-400 uppercase tracking-wide">
                            Current Session
                          </span>
                        )}
                      </div>
                      {(p === 'google' || p === 'email') && (localUser?.email || getCurrentUser()?.email) && (
                        <span className="font-urbanist text-[12px] text-[#757575] dark:text-[#9E9E9E] truncate block mt-0.5">
                          {localUser?.email || getCurrentUser()?.email}
                        </span>
                      )}
                    </div>
                    {canUnlink && p !== 'phone' && (
                      <button
                        onClick={() => setConfirmUnlink(p)}
                        className="p-1.5 text-[#757575] dark:text-[#9E9E9E] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all duration-200"
                        title="Unlink"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Delete Account */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-[#E0E0E0] dark:border-[#35383F]">
            <div className="flex flex-col mb-2 sm:mb-0">
              <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD]">
                Delete Account
              </span>
              <span className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD] mt-0.5">
                Permanently remove your account and all data
              </span>
            </div>
            <Button
              variant="danger"
              size="xs"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full sm:w-auto"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Game Statistics Card */}
      <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-6 mb-4">
        <h2 className="font-urbanist font-bold text-[18px] md:text-[20px] text-[#212121] dark:text-white mb-4">
          Game Statistics
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className="text-[#6949FF]" />
              <span className="font-urbanist text-[11px] font-semibold text-[#757575] dark:text-[#BDBDBD]">
                Games Played
              </span>
            </div>
            <p className="font-urbanist font-bold text-[22px] md:text-[24px] text-[#212121] dark:text-white">
              {gameStats?.totalGames || gameStats?.gamesPlayed || 0}
            </p>
          </div>

          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Check size={14} className="text-green-600" />
              <span className="font-urbanist text-[11px] font-semibold text-[#757575] dark:text-[#BDBDBD]">
                Completed
              </span>
            </div>
            <p className="font-urbanist font-bold text-[22px] md:text-[24px] text-[#212121] dark:text-white">
              {gameStats?.completedGames || gameStats?.completed || 0}
            </p>
          </div>

          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className="text-orange-600" />
              <span className="font-urbanist text-[11px] font-semibold text-[#757575] dark:text-[#BDBDBD]">
                Current Streak
              </span>
            </div>
            <p className="font-urbanist font-bold text-[22px] md:text-[24px] text-[#212121] dark:text-white">
              {gameStats?.currentStreak || gameStats?.streak || 0} days
            </p>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} className="text-blue-600" />
              <span className="font-urbanist text-[11px] font-semibold text-[#757575] dark:text-[#BDBDBD]">
                Completion Rate
              </span>
            </div>
            <p className="font-urbanist font-bold text-[22px] md:text-[24px] text-[#212121] dark:text-white">
              {typeof gameStats?.completionRate === 'string' && gameStats.completionRate.endsWith('%')
                ? gameStats.completionRate
                : `${gameStats?.completionRate || 0}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-6 mb-4">
        <h2 className="font-urbanist font-bold text-[18px] md:text-[20px] text-[#212121] dark:text-white mb-4">
          Recent Activity
        </h2>

        {sessionsLoading ? (
          <div className="flex items-center gap-2 text-[#757575] dark:text-[#9E9E9E]">
            <div className="w-4 h-4 border-2 border-[#6949FF] border-t-transparent rounded-full animate-spin" />
            <span className="font-urbanist text-[14px]">Loading...</span>
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-purple-50/50 dark:bg-purple-500/5 rounded-xl border border-purple-100/50 dark:border-purple-500/10">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity size={16} className="text-purple-600" strokeWidth={2} />
                <span className="font-urbanist text-[11px] font-semibold text-[#757575] dark:text-[#9E9E9E]">
                  Last Login
                </span>
              </div>
              <p className="font-urbanist font-bold text-[15px] md:text-[17px] text-[#181A20] dark:text-white">
                {formatSessionTime(sessions[0].loginTime)}
              </p>
            </div>
            <div className="p-4 bg-purple-50/50 dark:bg-purple-500/5 rounded-xl border border-purple-100/50 dark:border-purple-500/10">
              <div className="flex items-center gap-2 mb-1.5">
                <Monitor size={16} className="text-purple-600" strokeWidth={2} />
                <span className="font-urbanist text-[11px] font-semibold text-[#757575] dark:text-[#9E9E9E]">
                  Device
                </span>
              </div>
              <p className="font-urbanist font-bold text-[15px] md:text-[17px] text-[#181A20] dark:text-white">
                {sessions[0].browser} — {sessions[0].os}
              </p>
            </div>
            <div className="p-4 bg-purple-50/50 dark:bg-purple-500/5 rounded-xl border border-purple-100/50 dark:border-purple-500/10">
              <div className="flex items-center gap-2 mb-1.5">
                <MapPin size={16} className="text-purple-600" strokeWidth={2} />
                <span className="font-urbanist text-[11px] font-semibold text-[#757575] dark:text-[#9E9E9E]">
                  Location
                </span>
              </div>
              <p className="font-urbanist font-bold text-[15px] md:text-[17px] text-[#181A20] dark:text-white">
                {currentLocation || sessions[0].location || 'Local Network'}
              </p>
            </div>
          </div>
        ) : (
          <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#9E9E9E]">No session data yet.</p>
        )}
      </div>

      {/* Logged-in Devices */}
      <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-6">
        <h2 className="font-urbanist font-bold text-[18px] md:text-[20px] text-[#212121] dark:text-white mb-1">
          Logged-in Devices
        </h2>
        <p className="font-urbanist text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-4">
          Manage your active sessions on different browsers and devices
        </p>

        {sessionsLoading ? (
          <div className="flex items-center gap-2 text-[#757575] dark:text-[#9E9E9E] py-4">
            <div className="w-4 h-4 border-2 border-[#6949FF] border-t-transparent rounded-full animate-spin" />
            <span className="font-urbanist text-[14px]">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#9E9E9E] py-4">No active sessions.</p>
        ) : (
          <div className="space-y-3.5">
            {sessions.map((session) => {
              const IconComponent = getDeviceIcon(session.deviceType)
              return (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-[#181A20] border border-gray-100 dark:border-gray-800 transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-purple-100/60 dark:bg-[#6949FF]/10 flex items-center justify-center flex-shrink-0">
                      <IconComponent size={20} className="text-[#6949FF]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-urbanist font-bold text-[14px] text-[#212121] dark:text-white truncate">
                          {session.browser} on {session.os}
                        </span>
                        {session.isCurrent && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full font-urbanist font-bold text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wide">
                            Current Session
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 font-urbanist text-[12px] text-[#757575] dark:text-[#9E9E9E] mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {session.location || 'Unknown'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatSessionTime(session.loginTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      session.isCurrent
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20'
                        : 'text-[#757575] dark:text-[#9E9E9E] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                    }`}
                    title={session.isCurrent ? 'Log out this device' : 'Log out device'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      <SetEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => { setIsEmailModalOpen(false); fetchUserProfile().then(p => { if (p?.user) setLocalUser(prev => prev ? { ...prev, email: p.user.email, hasPassword: p.user.hasPassword } : prev); }); }}
        currentEmail={localUser?.email}
        hasPassword={!!localUser?.hasPassword}
      />
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)}
        hasPassword={canChangePassword}
        currentEmail={localUser?.email}
        onSuccess={() => {
          // Update hasPassword immediately so UI reflects the change
          setLocalUser(prev => prev ? { ...prev, hasPassword: true } : prev)
          // Also refresh from server to get latest profile
          refreshUserProfile().then(profile => {
            if (profile) setLocalUser(prev => prev ? { ...prev, ...profile } : profile)
          })
        }}
      />
      <ChangeNameModal
        isOpen={isNameModalOpen}
        onClose={() => setIsNameModalOpen(false)}
        currentName={localUser?.name || ''}
        onNameChanged={handleNameChanged}
      />
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDeleted={() => { window.location.href = '/' }}
      />

      {/* Unlink Confirmation Modal */}
      {confirmUnlink && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50" onClick={() => setConfirmUnlink(null)}>
          <div className="bg-white dark:bg-[#1F222A] rounded-2xl p-6 max-w-sm mx-4 shadow-2xl border border-[#E0E0E0] dark:border-[#35383F]" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <X size={24} className="text-red-600" strokeWidth={2.5} />
              </div>
              <h3 className="font-urbanist font-bold text-[18px] text-[#212121] dark:text-white">Unlink Account</h3>
              <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD]">
                Are you sure you want to unlink {confirmUnlink === 'email' ? 'Email' : confirmUnlink.charAt(0).toUpperCase() + confirmUnlink.slice(1)}?
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmUnlink(null)}
                  className="flex-1 py-2.5 rounded-full bg-gray-100 dark:bg-[#2A2D35] text-[#424242] dark:text-[#E0E0E0] font-urbanist font-semibold text-[14px] transition-all duration-200 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmUnlink(null); handleUnlinkProvider(confirmUnlink) }}
                  className="flex-1 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-urbanist font-semibold text-[14px] transition-all duration-200 active:scale-95"
                >
                  Unlink
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
