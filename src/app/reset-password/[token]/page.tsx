'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { notify } from '@/lib/toast'
import { images } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { resetPassword } from '@/lib/auth/frontend-auth'

export default function ResetPasswordPage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [tokenError, setTokenError] = useState(false)

  const validate = () => {
    const newErrors: typeof errors = {}

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    } else if (password.length > 16) {
      newErrors.password = 'Password must be at most 16 characters'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    const result = await resetPassword(token, password)

    setIsSubmitting(false)

    if (result.success) {
      notify.successKey('AUTH_RESET_SUCCESS')
      setIsSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } else {
      const isTokenInvalid =
        result.error?.toLowerCase().includes('token') ||
        result.error?.toLowerCase().includes('invalid') ||
        result.error?.toLowerCase().includes('expired')
      if (isTokenInvalid) {
        setTokenError(true)
      }
      notify.errorFromResult(result, 'AUTH_RESET_FAILED')
      setErrors({ general: notify.fromResult(result, 'AUTH_RESET_FAILED') })
    }
  }

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
            {!isSuccess && !tokenError && (
              <>
                <h2 className="font-urbanist font-bold text-[20px] text-[#212121] dark:text-white">
                  Set new password
                </h2>
                <p className="font-urbanist font-medium text-[14px] text-[#757575] dark:text-[#BDBDBD] text-center mt-2">
                  Enter your new password below.
                </p>
              </>
            )}
            {tokenError && (
              <>
                <h2 className="font-urbanist font-bold text-[20px] text-[#212121] dark:text-white">
                  Invalid link
                </h2>
                <p className="font-urbanist font-medium text-[14px] text-[#757575] dark:text-[#BDBDBD] text-center mt-2">
                  This reset link is invalid or has expired.
                </p>
              </>
            )}
          </div>

          {/* Success State */}
          {isSuccess ? (
            <div className="text-center py-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-[#22C55E] rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce">
                ✓
              </div>
              <div>
                <h3 className="font-urbanist font-bold text-[18px] text-[#212121] dark:text-white mb-1">
                  Password Reset!
                </h3>
                <p className="font-urbanist font-medium text-[14px] text-[#757575] dark:text-[#BDBDBD]">
                   Redirecting to home...
                 </p>
              </div>
               <Link href="/" className="w-full">
                 <Button variant="outline" className="w-full h-[48px] rounded-full text-base font-urbanist font-semibold">
                   Go to Home
                 </Button>
               </Link>
            </div>
          ) : tokenError ? (
            <div className="text-center py-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-[#EF4444] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                !
              </div>
              <div>
                <h3 className="font-urbanist font-bold text-[18px] text-[#212121] dark:text-white mb-1">
                  Link Expired
                </h3>
                <p className="font-urbanist font-medium text-[14px] text-[#757575] dark:text-[#BDBDBD]">
                  Please request a new password reset link.
                </p>
              </div>
              <Link href="/forgot-password" className="w-full">
                <Button className="w-full h-[48px] rounded-full text-base font-urbanist font-semibold bg-[#6949FF] hover:bg-[#5536E6]">
                  Request New Link
                </Button>
              </Link>
              <Link href="/login" className="font-urbanist font-semibold text-[14px] text-[#6949FF] hover:underline">
                Back to Log In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* General Error */}
              {errors.general && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="font-urbanist font-semibold text-[14px] text-red-600 dark:text-red-400 text-center">
                    {errors.general}
                  </p>
                </div>
              )}

              {/* New Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="font-urbanist font-bold text-[14px] text-[#424242] dark:text-[#E0E0E0]">
                  New password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    maxLength={20}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                    }}
                    className={`w-full h-[48px] pl-4 pr-11 rounded-xl border font-urbanist text-[15px] bg-white dark:bg-[#181A20] text-[#212121] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:border-transparent transition-all duration-200 ${
                      errors.password ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E0E0] dark:border-[#35383F]'
                    }`}
                    placeholder="Enter your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-[#9E9E9E] hover:text-[#212121] dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <span className="font-urbanist font-semibold text-[12px] text-red-500">
                    {errors.password}
                  </span>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="font-urbanist font-bold text-[14px] text-[#424242] dark:text-[#E0E0E0]">
                  Confirm new password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirm ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    maxLength={20}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }))
                    }}
                    className={`w-full h-[48px] pl-4 pr-11 rounded-xl border font-urbanist text-[15px] bg-white dark:bg-[#181A20] text-[#212121] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:border-transparent transition-all duration-200 ${
                      errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E0E0] dark:border-[#35383F]'
                    }`}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 text-[#9E9E9E] hover:text-[#212121] dark:hover:text-white transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="font-urbanist font-semibold text-[12px] text-red-500">
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full h-[48px] rounded-full text-base font-urbanist font-semibold bg-[#6949FF] hover:bg-[#5536E6]"
              >
                Reset Password
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
