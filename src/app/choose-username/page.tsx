'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { images } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { getCurrentUser, isLoggedIn, setUsername as setUsernameApi } from '@/lib/auth/frontend-auth'

export default function ChooseUsernamePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      toast.success('Username set! Welcome to Puzzroo.')
      window.location.replace('/')
    } else {
      setError(result.error || 'Failed to set username')
    }
  }

  const spinner = (
    <div className="min-h-screen bg-white dark:bg-[#181A20] flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-[#6949FF] border-t-transparent rounded-full" />
    </div>
  )

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
                placeholder="john_doe"
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
    </div>
  )
}
