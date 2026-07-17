'use client'

import { useState, useEffect } from 'react'
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal'
import { ChangeNameModal } from '@/components/account/ChangeNameModal'
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal'
import { getCurrentUser, deleteAccount, fetchGameStats, fetchSessions, revokeSession, fetchUserProfile } from '@/lib/auth/frontend-auth'
import { Check, Activity, BarChart3, Monitor, Smartphone, Tablet, MapPin, Laptop, Trash2, Clock, Mail, Phone } from 'lucide-react'

const PROVIDER_META: Record<string, { label: string; badge: string; badgeClass: string }> = {
  google: { label: 'Google', badge: 'G', badgeClass: 'text-[#4285F4]' },
  facebook: { label: 'Facebook', badge: 'f', badgeClass: 'text-[#1877F2]' },
  email: { label: 'Email & Password', badge: 'mail', badgeClass: 'text-[#6949FF]' },
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
}

function formatSessionTime(dateStr: string) {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Active now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AccountInformationPage() {
  const [localUser, setLocalUser] = useState(getCurrentUser())
  const [gameStats, setGameStats] = useState<any>(null)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionDevice[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [provider, setProvider] = useState<string | null>(localUser?.provider || null)
  const canChangePassword = !!localUser?.hasPassword

  const handleNameChanged = (newName: string) => {
    const stored = localStorage.getItem('puzzroo_user')
    if (stored) {
      const parsed = JSON.parse(stored)
      parsed.name = newName
      localStorage.setItem('puzzroo_user', JSON.stringify(parsed))
      window.dispatchEvent(new Event('auth-change'))
    }
    setLocalUser(prev => prev ? { ...prev, name: newName } : prev)
  }

  useEffect(() => {
    fetchGameStats().then(setGameStats)
    fetchSessions().then(s => {
      setSessions(s)
      setSessionsLoading(false)
    })
    fetchUserProfile().then(profile => {
      if (!profile) return
      if (profile.provider) setProvider(profile.provider)
      // Sync freshly-fetched fields (e.g. the backfilled publicId) into local
      // state and the cached user so the Account ID shows the friendly id.
      if (profile.publicId) {
        setLocalUser(prev => prev ? { ...prev, publicId: profile.publicId } : prev)
        const stored = localStorage.getItem('puzzroo_user')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            parsed.publicId = profile.publicId
            localStorage.setItem('puzzroo_user', JSON.stringify(parsed))
          } catch {}
        }
      }
    })
  }, [])

  const handleRevokeSession = async (id: string) => {
    const ok = await revokeSession(id)
    if (ok) setSessions(prev => prev.filter(s => s.id !== id))
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
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-urbanist font-bold text-[26px] md:text-[32px] text-[#212121] dark:text-white mb-1">
          {localUser?.name || 'User'}
        </h1>
        <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD]">
          Account Information
        </p>
      </div>

      {/* Account Details Card */}
      <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-6 mb-4">
        <h2 className="font-urbanist font-bold text-[18px] md:text-[20px] text-[#212121] dark:text-white mb-4">
          Account Details
        </h2>

        <div className="space-y-3">
          {/* Name */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-2 sm:mb-0">
              Name
            </span>
            <div className="flex items-center gap-3">
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                {localUser?.name || 'N/A'}
              </span>
              <button 
                onClick={() => setIsNameModalOpen(true)}
                className="px-5 py-1.5 bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[13px] transition-all duration-200 active:scale-95"
              >
                Change
              </button>
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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-2 sm:mb-0">
              Username
            </span>
            <div className="flex flex-col items-start sm:items-end">
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                {localUser?.username || 'N/A'}
              </span>
              <span className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD] mt-0.5">
                Username cannot be changed
              </span>
            </div>
          </div>

          {/* Email Address */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
              Email Address
            </span>
            <div className="flex flex-col items-start sm:items-end">
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white break-all">
                {localUser?.email || 'N/A'}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <Check size={12} className="text-green-600 dark:text-green-400" strokeWidth={3} />
                <span className="font-urbanist text-[11px] text-green-600 dark:text-green-400 font-semibold">
                  Verified
                </span>
              </div>
              <span className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD] mt-0.5">
                Email address cannot be changed
              </span>
            </div>
          </div>

          {/* Password */}
          {canChangePassword && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-[#E0E0E0] dark:border-[#35383F]">
              <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-2 sm:mb-0">
                Password
              </span>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="w-full sm:w-auto px-5 py-1.5 bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[13px] transition-all duration-200 active:scale-95"
              >
                Change
              </button>
            </div>
          )}

          {/* Subscription Plan */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2">
            <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
              Subscription Plan
            </span>
            <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white capitalize">
              {localUser?.subscriptionPlan || 'Free'}
            </span>
          </div>

          {/* Connected Accounts */}
          <div className="pt-3">
            <h3 className="font-urbanist font-bold text-[14px] text-[#212121] dark:text-white mb-2">
              Connected Accounts
            </h3>
            {(() => {
              const meta = PROVIDER_META[provider || ''] || PROVIDER_META['email']
              return (
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-[#181A20] rounded-xl max-w-sm">
                  <div className="w-8 h-8 bg-white dark:bg-[#1F222A] rounded-lg flex items-center justify-center border border-gray-100 dark:border-gray-800">
                    {meta.badge === 'mail' ? (
                      <Mail size={16} className={meta.badgeClass} strokeWidth={2.5} />
                    ) : meta.badge === 'phone' ? (
                      <Phone size={16} className={meta.badgeClass} strokeWidth={2.5} />
                    ) : (
                      <span className={`text-[16px] font-extrabold ${meta.badgeClass}`}>{meta.badge}</span>
                    )}
                  </div>
                  <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                    {meta.label}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <Check size={12} className="text-green-600 dark:text-green-400" strokeWidth={3} />
                    <span className="font-urbanist text-[11px] text-green-600 dark:text-green-400 font-semibold">
                      Connected
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Delete Account */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 mt-1 border-t border-[#E0E0E0] dark:border-[#35383F]">
            <div className="flex flex-col mb-2 sm:mb-0">
              <span className="font-urbanist font-semibold text-[13px] text-[#757575] dark:text-[#BDBDBD]">
                Delete Account
              </span>
              <span className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD] mt-0.5">
                Permanently remove your account and all data
              </span>
            </div>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full sm:w-auto px-5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full font-urbanist font-semibold text-[13px] transition-all duration-200 active:scale-95"
            >
              Delete Account
            </button>
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
              {gameStats?.completionRate || gameStats?.completionRate || 0}%
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
                {sessions[0].location || 'Unknown'}
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

                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="p-2 text-[#757575] dark:text-[#9E9E9E] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition-all duration-200"
                      title="Log out device"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
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
    </div>
  )
}
