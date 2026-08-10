'use client'

import React, { useState, useEffect } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { images } from '@/lib/utils'
import { manageEmail } from '@/lib/auth/frontend-auth'
import { Button } from '@/components/ui/button'

interface SetEmailModalProps {
  isOpen: boolean
  onClose: () => void
  currentEmail?: string | null
  hasPassword?: boolean
}

export function SetEmailModal({ isOpen, onClose, currentEmail }: SetEmailModalProps) {
  const [email, setEmail] = useState(currentEmail || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEmail(currentEmail || '')
      setPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setShowConfirmPassword(false)
      setError('')
      setSuccess(false)
      setIsLoading(false)
      setUnlocked(false)
    }
  }, [isOpen, currentEmail])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email')
      return
    }

    // Validate password
    if (!password) {
      setError('Password is required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    if (password.length > 20) {
      setError('Password must be at most 20 characters long')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const res = await manageEmail(trimmedEmail, password)
      if (!res.success) {
        setError(res.error || 'Failed to update email')
        setIsLoading(false)
        return
      }
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 4000)
    } catch {
      setError('Failed to update. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setSuccess(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/60 dark:bg-black/80 animate-fadeIn overflow-y-auto" onClick={handleClose}>
      <div 
        className="w-full max-w-[480px] bg-white dark:bg-[#1A1D23] rounded-3xl shadow-2xl relative overflow-hidden animate-slideUp my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-[#6949FF] to-[#8B5CF6]" />

        <button
          onClick={handleClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#2A2D35] dark:hover:bg-[#35383F] text-gray-500 dark:text-gray-400 transition-colors z-10"
          aria-label="Close modal"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="p-4 sm:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-purple-50 dark:bg-[#6949FF]/10 rounded-2xl flex items-center justify-center mb-5 border border-purple-100 dark:border-[#6949FF]/20 shadow-sm">
              <Image src={images.gmailIcon} width={32} height={32} alt="Email" className="w-8 h-8" />
            </div>
            <h2 className="font-urbanist font-bold text-[28px] text-[#212121] dark:text-white mb-2">
              {currentEmail ? 'Update Email' : 'Set Email'}
            </h2>
            <p className="font-urbanist text-[15px] text-[#757575] dark:text-[#9E9E9E]">
              {currentEmail
                ? 'Update your email address'
                : 'Add an email address to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-5">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl">
                <p className="font-urbanist text-[14px] font-semibold text-red-600 dark:text-red-400 text-center">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-xl">
                <p className="font-urbanist text-[14px] font-semibold text-green-600 dark:text-green-400 text-center">
                  Confirmation email sent to {email.trim()}. Click the link in the email to finish
                  {currentEmail ? ' updating your email' : ' adding your email'}.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
                className="w-full h-[52px] bg-[#FAFAFA] dark:bg-[#15171C] border border-[#EEEEEE] dark:border-[#2A2D35] rounded-xl px-5 font-urbanist text-[15px] text-[#212121] dark:text-white placeholder-[#BDBDBD] dark:placeholder-[#757575] focus:outline-none focus:border-[#6949FF] dark:focus:border-[#6949FF] focus:bg-white dark:focus:bg-[#1A1D23] transition-all"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={unlocked && !showPassword ? "password" : "text"}
                  value={password}
                  maxLength={20}
                  readOnly={!unlocked}
                  onFocus={() => setUnlocked(true)}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  required
                  className="w-full h-[52px] bg-[#FAFAFA] dark:bg-[#15171C] border border-[#EEEEEE] dark:border-[#2A2D35] rounded-xl px-5 font-urbanist text-[15px] text-[#212121] dark:text-white placeholder-[#BDBDBD] dark:placeholder-[#757575] focus:outline-none focus:border-[#6949FF] dark:focus:border-[#6949FF] focus:bg-white dark:focus:bg-[#1A1D23] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-[#9E9E9E] hover:text-[#212121] dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-2">
              <label className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={unlocked && !showConfirmPassword ? "password" : "text"}
                  value={confirmPassword}
                  maxLength={20}
                  readOnly={!unlocked}
                  onFocus={() => setUnlocked(true)}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  required
                  className="w-full h-[52px] bg-[#FAFAFA] dark:bg-[#15171C] border border-[#EEEEEE] dark:border-[#2A2D35] rounded-xl px-5 font-urbanist text-[15px] text-[#212121] dark:text-white placeholder-[#BDBDBD] dark:placeholder-[#757575] focus:outline-none focus:border-[#6949FF] dark:focus:border-[#6949FF] focus:bg-white dark:focus:bg-[#1A1D23] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 text-[#9E9E9E] hover:text-[#212121] dark:hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={success}
              className="mt-4 h-[56px] shadow-lg shadow-[#6949FF]/20"
            >
              {success ? 'Email Sent!' : 'Save Changes'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
