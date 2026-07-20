'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'
import { getCurrentUser } from '@/lib/auth/frontend-auth'
import {
  Search, User as UserIcon, Clock, MapPin, Monitor, Globe, Fingerprint,
  Activity, ChevronLeft, ChevronRight, AlertCircle, Loader2,
} from 'lucide-react'

interface TrackedUser {
  id: string
  publicId: string | null
  username: string
  name: string | null
  email: string | null
  role: string
  provider: string
  status: string
  avatar: string | null
  createdAt: string
  lastLoginAt: string | null
  lastActiveAt: string | null
}

interface TrackEvent {
  id: string
  type: string
  event: string | null
  path: string | null
  url: string | null
  referrer: string | null
  ip: string | null
  browser: string | null
  os: string | null
  deviceType: string | null
  location: string | null
  source: string | null
  properties: Record<string, any>
  timestamp: string
}

interface TrackingResult {
  user: TrackedUser
  totalEvents: number
  firstSeen: string | null
  byEvent: { event: string; count: number }[]
  page: number
  limit: number
  hasMore: boolean
  events: TrackEvent[]
}

const EVENT_LABELS: Record<string, string> = {
  $pageview: 'Page view',
  $identify: 'Identified',
  login: 'Login',
  logout: 'Logout',
  logged_out: 'Logout',
  signup_completed: 'Signup',
  email_verified: 'Email verified',
  username_set: 'Username set',
  guest_converted: 'Guest converted',
  password_changed: 'Password changed',
  password_reset_requested: 'Reset requested',
  password_reset_completed: 'Reset completed',
  profile_updated: 'Profile updated',
  account_deleted: 'Account deleted',
  heartbeat: 'Heartbeat',
}

function eventLabel(e: TrackEvent): string {
  if (e.type === 'page') return e.path ? `Page: ${e.path}` : 'Page view'
  const key = e.event || ''
  return EVENT_LABELS[key] || key || e.type
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return fmtDateTime(iso)
}

const typeBadge: Record<string, string> = {
  page: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  track: 'bg-purple-100 text-purple-700 dark:bg-[#6949FF]/15 dark:text-purple-300',
  identify: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
}

export default function AdminTrackingPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<TrackingResult | null>(null)
  const [page, setPage] = useState(1)
  const [activeQuery, setActiveQuery] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [promoteMsg, setPromoteMsg] = useState('')

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || u.role !== 'admin') {
      router.replace('/account-information')
      return
    }
    setIsAdmin(true)
    setAuthChecked(true)
  }, [router])

  const runSearch = useCallback(async (q: string, pageNum: number) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api<TrackingResult>(`/api/v1/analytics/user`, {
        params: { q: q.trim(), page: String(pageNum), limit: '50' },
      })
      if (!res.success) {
        setData(null)
        setError((res.payload as any)?.error?.message || 'No results found')
        return
      }
      setData(res.payload)
    } catch {
      setData(null)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setActiveQuery(query)
    runSearch(query, 1)
  }

  const goToPage = (p: number) => {
    setPage(p)
    runSearch(activeQuery, p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const promoteUser = async () => {
    if (!data) return
    setPromoting(true)
    setPromoteMsg('')
    try {
      const res = await api(`/api/v1/admin/promote`, {
        method: 'POST',
        body: JSON.stringify({ identifier: data.user.id }),
      })
      if (!res.success) {
        setPromoteMsg((res.payload as any)?.error?.message || 'Failed to promote user')
        return
      }
      setData({ ...data, user: { ...data.user, role: 'admin' } })
      setPromoteMsg('User promoted to admin.')
    } catch {
      setPromoteMsg('Network error. Please try again.')
    } finally {
      setPromoting(false)
    }
  }

  if (!authChecked || !isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#6949FF] animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={22} className="text-[#6949FF]" />
          <h1 className="font-urbanist font-bold text-[26px] md:text-[32px] text-[#212121] dark:text-white">
            User Tracking
          </h1>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-[#6949FF]/10 text-[#6949FF] text-[11px] font-bold uppercase tracking-wide">
            Admin
          </span>
        </div>
        <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD]">
          Search a user by their Account ID to view their activity history.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Account ID (e.g. 483-920-175-6), username or email"
              className="w-full pl-11 pr-4 py-3 rounded-xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] bg-white dark:bg-[#1F222A] text-[#212121] dark:text-white font-urbanist text-[14px] outline-none focus:border-[#6949FF] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-[#6949FF] hover:bg-[#5536E6] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-urbanist font-semibold text-[14px] transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Search
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 mb-4">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <span className="font-urbanist text-[14px] text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* User summary */}
          <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-6 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#6949FF]/10 flex items-center justify-center shrink-0 overflow-hidden">
                {data.user.avatar
                  ? <img src={data.user.avatar} alt="" className="w-full h-full object-cover" />
                  : <UserIcon size={22} className="text-[#6949FF]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-urbanist font-bold text-[18px] text-[#212121] dark:text-white truncate">
                    {data.user.name || data.user.username}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#35383F] text-[#616161] dark:text-[#BDBDBD] text-[11px] font-semibold capitalize">
                    {data.user.role}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#35383F] text-[#616161] dark:text-[#BDBDBD] text-[11px] font-semibold capitalize">
                    {data.user.provider}
                  </span>
                  {data.user.role !== 'admin' && (
                    <button
                      onClick={promoteUser}
                      disabled={promoting}
                      className="px-3 py-1 rounded-full bg-[#6949FF] hover:bg-[#5536E6] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-semibold transition-colors active:scale-95"
                    >
                      {promoting ? 'Promoting…' : 'Make Admin'}
                    </button>
                  )}
                </div>
                {promoteMsg && (
                  <p className={`font-urbanist text-[12px] mt-2 ${promoteMsg.includes('promoted') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {promoteMsg}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3">
                  <InfoRow icon={Fingerprint} label="Account ID" value={data.user.publicId || data.user.id} mono />
                  <InfoRow icon={UserIcon} label="Username" value={data.user.username} />
                  <InfoRow icon={Globe} label="Email" value={data.user.email || '—'} />
                  <InfoRow icon={Clock} label="Joined" value={fmtDateTime(data.user.createdAt)} />
                  <InfoRow icon={Clock} label="Last login" value={fmtRelative(data.user.lastLoginAt)} />
                  <InfoRow icon={Activity} label="Last active" value={fmtRelative(data.user.lastActiveAt)} />
                </div>
              </div>
            </div>
          </div>

          {/* Stats + breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-6 lg:col-span-1">
              <p className="font-urbanist text-[12px] font-semibold text-[#757575] dark:text-[#BDBDBD] mb-1">Total Events</p>
              <p className="font-urbanist font-bold text-[32px] text-[#212121] dark:text-white leading-tight">{data.totalEvents}</p>
              <p className="font-urbanist text-[12px] text-[#757575] dark:text-[#9E9E9E] mt-1">
                First seen: {fmtDateTime(data.firstSeen)}
              </p>
            </div>
            <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-6 lg:col-span-2">
              <p className="font-urbanist text-[12px] font-semibold text-[#757575] dark:text-[#BDBDBD] mb-3">Event Breakdown</p>
              {data.byEvent.length === 0 ? (
                <p className="font-urbanist text-[13px] text-[#9E9E9E]">No events.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.byEvent.map((b) => (
                    <span key={b.event} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-[#6949FF]/10 text-[#6949FF] dark:text-purple-300 font-urbanist text-[12px] font-semibold">
                      {EVENT_LABELS[b.event] || b.event}
                      <span className="px-1.5 py-0.5 rounded-full bg-[#6949FF] text-white text-[10px] font-bold">{b.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Events table */}
          <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-urbanist font-bold text-[18px] md:text-[20px] text-[#212121] dark:text-white">
                Activity History
              </h2>
              <span className="font-urbanist text-[12px] text-[#757575] dark:text-[#9E9E9E]">
                Page {data.page}
              </span>
            </div>

            {data.events.length === 0 ? (
              <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#9E9E9E]">No activity recorded for this user.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-[#E0E0E0] dark:border-[#35383F]">
                      <th className="px-3 py-2 font-urbanist text-[11px] font-bold uppercase tracking-wide text-[#9E9E9E]">Time</th>
                      <th className="px-3 py-2 font-urbanist text-[11px] font-bold uppercase tracking-wide text-[#9E9E9E]">Type</th>
                      <th className="px-3 py-2 font-urbanist text-[11px] font-bold uppercase tracking-wide text-[#9E9E9E]">Event</th>
                      <th className="px-3 py-2 font-urbanist text-[11px] font-bold uppercase tracking-wide text-[#9E9E9E]">Device</th>
                      <th className="px-3 py-2 font-urbanist text-[11px] font-bold uppercase tracking-wide text-[#9E9E9E]">Location</th>
                      <th className="px-3 py-2 font-urbanist text-[11px] font-bold uppercase tracking-wide text-[#9E9E9E]">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((e) => (
                      <tr key={e.id} className="border-b border-[#F0F0F0] dark:border-[#2A2D35] hover:bg-gray-50 dark:hover:bg-[#181A20]">
                        <td className="px-3 py-2.5 font-urbanist text-[12px] text-[#616161] dark:text-[#BDBDBD] whitespace-nowrap">
                          {fmtDateTime(e.timestamp)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeBadge[e.type] || 'bg-gray-100 text-gray-600'}`}>
                            {e.type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-urbanist text-[13px] font-semibold text-[#212121] dark:text-white">
                          {eventLabel(e)}
                        </td>
                        <td className="px-3 py-2.5 font-urbanist text-[12px] text-[#616161] dark:text-[#BDBDBD] whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Monitor size={12} className="text-[#9E9E9E]" />
                            {[e.browser, e.os].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-urbanist text-[12px] text-[#616161] dark:text-[#BDBDBD] whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-[#9E9E9E]" />
                            {e.location || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-urbanist font-mono text-[12px] text-[#616161] dark:text-[#BDBDBD] whitespace-nowrap">
                          {e.ip || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {(data.page > 1 || data.hasMore) && (
              <div className="flex items-center justify-center gap-3 mt-5">
                <button
                  onClick={() => goToPage(data.page - 1)}
                  disabled={data.page <= 1 || loading}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#E0E0E0] dark:border-[#35383F] text-[#616161] dark:text-[#BDBDBD] font-urbanist text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#6949FF] hover:text-[#6949FF] transition-colors"
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span className="font-urbanist text-[13px] text-[#757575] dark:text-[#9E9E9E]">Page {data.page}</span>
                <button
                  onClick={() => goToPage(data.page + 1)}
                  disabled={!data.hasMore || loading}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg border border-[#E0E0E0] dark:border-[#35383F] text-[#616161] dark:text-[#BDBDBD] font-urbanist text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#6949FF] hover:text-[#6949FF] transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {!data && !error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-[#6949FF]/10 flex items-center justify-center mb-3">
            <Search size={24} className="text-[#6949FF]" />
          </div>
          <p className="font-urbanist font-semibold text-[15px] text-[#212121] dark:text-white">Search for a user</p>
          <p className="font-urbanist text-[13px] text-[#757575] dark:text-[#9E9E9E] mt-1">
            Enter an Account ID above to view their tracking history.
          </p>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1 min-w-0">
      <Icon size={13} className="text-[#9E9E9E] shrink-0" />
      <span className="font-urbanist text-[12px] text-[#757575] dark:text-[#9E9E9E] shrink-0">{label}:</span>
      <span className={`font-urbanist text-[12px] font-semibold text-[#212121] dark:text-white truncate ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}
