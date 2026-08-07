'use client'

import { Mail, Shield, Bell, BookOpen } from 'lucide-react'
import Image from 'next/image'
import { images } from '@/lib/utils'
import { notify } from '@/lib/toast'
import { useEmailPreferences, type EmailPreference } from '@/hooks/useEmailPreferences'

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'mail':
      return function GmailIconComp(props: any) { 
        return <Image src={images.gmailIcon} width={props.size || 18} height={props.size || 18} alt="Email" className={props.className} /> 
      }
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
  const { preferences, isLoading, updatePreferences, isUpdating } = useEmailPreferences()

  const togglePreference = async (id: string) => {
    const updated = preferences.map((pref: EmailPreference) =>
      pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
    )
    const prefsMap: Record<string, boolean> = {}
    updated.forEach((p: EmailPreference) => { prefsMap[p.id] = p.enabled })
    
    // Fire and forget, no toasts. Handled optimistically by React Query.
    updatePreferences(prefsMap).catch(() => {
      // Errors handled silently or via React Query rollbacks
    })
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
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className={`flex items-center justify-between p-4 md:p-5 ${
                index !== 4 ? 'border-b border-[#E0E0E0] dark:border-[#35383F]' : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-1 mr-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-[#35383F] rounded-xl animate-pulse" />
                <div className="flex-1 min-w-0 flex flex-col gap-2 justify-center py-1">
                  <div className="h-4 bg-gray-200 dark:bg-[#35383F] rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-[#35383F] rounded animate-pulse w-2/3" />
                </div>
              </div>
              <div className="h-6 w-11 flex-shrink-0 rounded-full bg-gray-200 dark:bg-[#35383F] animate-pulse" />
            </div>
          ))
        ) : (
          preferences.map((pref: EmailPreference, index: number) => {
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
        })
        )}
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
