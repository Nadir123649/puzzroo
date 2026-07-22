'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/toast'
import { images } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { getCurrentUser, isLoggedIn, setUsername as setUsernameApi, linkAndMerge } from '@/lib/auth/frontend-auth'

export default function ChooseUsernamePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUsername, setLinkUsername] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isLoggedIn()) {
      window.location.replace('/login')
      return
    }
    const user = getCurrentUser()
    // Users who already picked a username don't belong here.
    if (user?.usernameSet) {
      window.location.replace('/')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = username.trim()
    if (!/^[a-z0-9._-]{3,20}$/.test(trimmed)) {
      setError('Username must be 3-20 characters: lowercase letters, numbers, . _ or -')
      return
    }

    setIsSubmitting(true)
    const result = await setUsernameApi(trimmed)
    setIsSubmitting(false)

    if (result.success) {
      notify.successKey('AUTH_USERNAME_SET')
      window.location.replace('/')
    } else if (result.code === 'username_taken_conflict') {
      setLinkUsername(trimmed)
      setShowLinkModal(true)
    } else {
      setError(result.error || 'Failed to set username')
    }
  }

  const spinner = (
    <div className="min-h-screen bg-white dark:bg-[#181A20] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-[#6949FF] border-t-transparent rounded-full" />
    </div>
  )

  const handleLinkAccounts = async () => {
    setLinkLoading(true)
    const result = await linkAndMerge(linkUsername)
    setLinkLoading(false)
    if (result.success) {
      setShowLinkModal(false)
      notify.success('Accounts linked! Welcome back.')
      window.location.replace('/')
    } else {
      setError(result.error || 'Failed to link accounts')
      setShowLinkModal(false)
    }
  }

  if (!mounted) return spinner

  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <Navbar />

      <main className="flex-grow flex items-center justify-center px-[20px] py-[40px] md:py-[60px]">
        <div className="w-full max-w-[420px] bg-white dark:bg-[#1F222A] rounded-[24px] p-4 sm:p-5 border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] shadow-lg shadow-purple-500/5 transition-all duration-300">

          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <Link href="/" className="flex items-center gap-[clamp(8px,1vw,12px)] mb-3 select-none">
              <Image
                src={images.logo}
                alt="Puzzroo Logo"
                width={32}
                height={32}
                className="w-6 h-6 md:w-8 md:h-8 rounded-lg"
              />
              <span className="font-urbanist text-[20px] md:text-[32px] font-extrabold tracking-tight text-[#181A20] dark:text-white">
                Puzzroo
              </span>
            </Link>
            <h2 className="font-urbanist font-bold text-[20px] text-[#212121] dark:text-white">
              Choose your username
            </h2>
            <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD] text-center mt-1">
              Pick a unique username. This cannot be changed later.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="font-urbanist font-semibold text-[14px] text-red-600 dark:text-red-400 text-center">
                  {error}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="font-urbanist font-bold text-[14px] text-[#424242] dark:text-[#E0E0E0]">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                maxLength={20}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase())
                  if (error) setError('')
                }}
                className={`w-full h-[48px] px-4 rounded-xl border font-urbanist text-[15px] bg-white dark:bg-[#181A20] text-[#212121] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:border-transparent transition-all duration-200 ${
                  error ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E0E0] dark:border-[#35383F]'
                }`}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
              />
              <span className="font-urbanist text-[11px] text-[#9E9E9E]">
                Lowercase letters, numbers, . _ or - only.
              </span>
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full h-[48px] rounded-full text-base font-urbanist font-semibold bg-[#6949FF] hover:bg-[#5536E6]"
            >
              Continue
            </Button>
          </form>

        </div>
      </main>

      <Footer />

      {/* Link Accounts Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/60 dark:bg-black/80 animate-fadeIn">
          <div className="w-full max-w-[420px] bg-white dark:bg-[#1A1D23] rounded-3xl shadow-2xl relative overflow-hidden animate-slideUp my-auto p-4 sm:p-8">
            <button
              onClick={() => setShowLinkModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#2A2D35] dark:hover:bg-[#35383F] text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X size={18} strokeWidth={2.5} />
            </button>

            <div className="flex flex-col items-center text-center mt-4">
              <div className="w-14 h-14 bg-purple-50 dark:bg-[#6949FF]/10 rounded-2xl flex items-center justify-center mb-4 border border-purple-100 dark:border-[#6949FF]/20">
                <span className="text-2xl">🔗</span>
              </div>
              <h3 className="font-urbanist font-bold text-[22px] text-[#212121] dark:text-white mb-2">
                Link Accounts?
              </h3>
              <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#9E9E9E] mb-6">
                An account with the username <strong className="text-[#212121] dark:text-white">{linkUsername}</strong> already exists. This appears to be your account — would you like to link your email login to it and keep all your existing data?
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleLinkAccounts}
                  disabled={linkLoading}
                  className="w-full h-[48px] bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {linkLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Linking...
                    </>
                  ) : (
                    'Link Accounts'
                  )}
                </button>
                <button
                  onClick={() => setShowLinkModal(false)}
                  disabled={linkLoading}
                  className="w-full h-[48px] bg-transparent border border-[#E0E0E0] dark:border-[#35383F] text-[#212121] dark:text-white rounded-full font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  Choose a different username
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
