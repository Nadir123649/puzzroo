'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { images } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validate = () => {
    if (!email.trim()) {
      setError('Email is required')
      return false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format')
      return false
    }
    setError(undefined)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    // Simulate forgot password API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-[20px] py-[40px] md:py-[60px]">
        <div className="w-full max-w-[420px] bg-white dark:bg-[#1F222A] rounded-[24px] p-4 sm:p-5 border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] shadow-lg shadow-purple-500/5 transition-all duration-300">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-6">
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
              Reset your password
            </h2>
            <p className="font-urbanist font-medium text-[14px] text-[#757575] dark:text-[#BDBDBD] text-center mt-2">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          {isSuccess ? (
            <div className="text-center py-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-[#22C55E] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-urbanist font-bold text-[18px] text-[#212121] dark:text-white mb-1">
                  Email Sent!
                </h3>
                <p className="font-urbanist font-medium text-[14px] text-[#757575] dark:text-[#BDBDBD]">
                  Check your inbox at <strong className="text-[#212121] dark:text-white">{email}</strong> for instructions.
                </p>
              </div>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full h-[48px] rounded-full text-base font-urbanist font-semibold">
                  Back to Log In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="font-urbanist font-bold text-[14px] text-[#424242] dark:text-[#E0E0E0]">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(undefined)
                  }}
                  className={`w-full h-[48px] px-4 rounded-xl border font-urbanist text-[15px] bg-white dark:bg-[#181A20] text-[#212121] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:border-transparent transition-all duration-200 ${
                    error ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E0E0] dark:border-[#35383F]'
                  }`}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
                {error && (
                  <span className="font-urbanist font-semibold text-[12px] text-red-500">
                    {error}
                  </span>
                )}
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full h-[48px] rounded-full text-base font-urbanist font-semibold bg-[#6949FF] hover:bg-[#5536E6]"
              >
                Send Reset Link
              </Button>

              {/* Back to Login */}
              <div className="text-center pt-2">
                <Link href="/login" className="font-urbanist font-semibold text-[14px] text-[#6949FF] hover:underline">
                  Back to Log In
                </Link>
              </div>
            </form>
          )}

        </div>
      </main>
      
      <Footer />
    </div>
  )
}
