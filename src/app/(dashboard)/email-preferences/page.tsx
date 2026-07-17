'use client'

import { useEffect, useState } from 'react'
import { Mail, Shield, Bell, BookOpen } from 'lucide-react'

interface EmailPreference {
  id: string
  title: string
  description: string
  iconName: 'mail' | 'bell' | 'shield' | 'book'
  enabled: boolean
}

const defaultPreferences: EmailPreference[] = [
  {
    id: 'updates',
    title: 'Puzzroo Updates',
    description: 'Get notified about new features, games, and platform updates',
    iconName: 'mail',
    enabled: true,
  },
  {
    id: 'daily-challenge',
    title: 'Daily Challenge Reminder',
    description: 'Receive a daily email reminder to solve today\'s puzzle',
    iconName: 'bell',
    enabled: true,
  },
  {
    id: 'competition',
    title: 'Competition & Social Alerts',
    description: 'Updates about leaderboards, achievements, and community events',
    iconName: 'shield',
    enabled: false,
  },
  {
    id: 'tips',
    title: 'Game Tips & Tutorials',
    description: 'Learn new strategies and improve your puzzle-solving skills',
    iconName: 'book',
    enabled: true,
  },
  {
    id: 'security',
    title: 'Account Security Notices',
    description: 'Important alerts about login activity and security updates',
    iconName: 'shield',
    enabled: true,
  },
]

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'mail':
      return Mail
    case 'bell':
      return Bell
    case 'shield':
      return Shield
    case 'book':
      return BookOpen
    default:
      return Mail
  }
}

export default function EmailPreferencesPage() {
  const [preferences, setPreferences] = useState<EmailPreference[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    import('@/lib/auth/frontend-auth').then(({ fetchEmailPreferences }) =>
      fetchEmailPreferences().then((data: any) => {
        if (data?.preferences) {
          setPreferences(data.preferences)
        } else {
          setPreferences(defaultPreferences)
        }
      })
    )
  }, [])

  const togglePreference = async (id: string) => {
    const updated = preferences.map(pref =>
      pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
    )
    setPreferences(updated)
    const { updateEmailPreferences } = await import('@/lib/auth/frontend-auth')
    const prefsMap: Record<string, boolean> = {}
    updated.forEach(p => { prefsMap[p.id] = p.enabled })
    updateEmailPreferences(prefsMap)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-urbanist font-bold text-[26px] md:text-[32px] text-[#212121] dark:text-white mb-1">
          Email Preferences
        </h1>
        <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD]">
          Manage your email notification settings
        </p>
      </div>

      {/* Preferences List */}
      <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] overflow-hidden">
        {preferences.map((pref, index) => {
          const Icon = getIcon(pref.iconName)
          return (
            <div
              key={pref.id}
              className={`flex items-center justify-between p-4 md:p-5 ${
                index !== preferences.length - 1
                  ? 'border-b border-[#E0E0E0] dark:border-[#35383F]'
                  : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-1 mr-4">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Icon size={18} className="text-[#6949FF]" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-urbanist font-bold text-[14px] md:text-[15px] text-[#212121] dark:text-white mb-0.5 truncate">
                    {pref.title}
                  </h3>
                  <p className="font-urbanist text-[12px] md:text-[13px] text-[#757575] dark:text-[#BDBDBD] leading-snug">
                    {pref.description}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => togglePreference(pref.id)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:ring-offset-2 dark:focus:ring-offset-[#181A20] ${
                  pref.enabled ? 'bg-[#6949FF]' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                role="switch"
                aria-checked={pref.enabled}
                aria-label={`Toggle ${pref.title}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    pref.enabled ? 'translate-x-6' : 'translate-x-1'
                  } mt-1`}
                />
              </button>
            </div>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="font-urbanist text-[13px] text-blue-900 dark:text-blue-300">
          <strong>Note:</strong> Account Security Notices are critical for protecting your account. 
          We recommend keeping this notification enabled.
        </p>
      </div>
    </div>
  )
}
