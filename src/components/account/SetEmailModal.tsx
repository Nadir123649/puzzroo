'use client'

import React, { useState, useEffect } from 'react'
import { X, Mail, Eye, EyeOff } from 'lucide-react'
import { notify } from '@/lib/toast'
import { manageEmail } from '@/lib/auth/frontend-auth'

interface SetEmailModalProps {
  isOpen: boolean
  onClose: () => void
  currentEmail?: string | null
  hasPassword: boolean
}

export function SetEmailModal({ isOpen, onClose, currentEmail, hasPassword }: SetEmailModalProps) {
  const [email, setEmail] = useState(currentEmail || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [enablePassword, setEnablePassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEmail(currentEmail || '')
      setPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setShowConfirmPassword(false)
      setEnablePassword(false)
      setError('')
      setSuccess(false)
      setIsLoading(false)
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

    if (enablePassword) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      if (password.length > 20) {
        setError('Password must be at most 20 characters')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setIsLoading(true)
    try {
      const res = await manageEmail(trimmedEmail, enablePassword ? password : undefined)
      if (!res.success) {
        setError(res.error || 'Failed to update email')
        setIsLoading(false)
        return
      }
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
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
    setEnablePassword(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/60 dark:bg-black/80 animate-fadeIn overflow-y-auto">
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
              <Mail className="w-8 h-8 text-[#6949FF]" />
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                  Email updated successfully!
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
                required
                className="w-full h-[52px] bg-[#FAFAFA] dark:bg-[#15171C] border border-[#EEEEEE] dark:border-[#2A2D35] rounded-xl px-5 font-urbanist text-[15px] text-[#212121] dark:text-white placeholder-[#BDBDBD] dark:placeholder-[#757575] focus:outline-none focus:border-[#6949FF] dark:focus:border-[#6949FF] focus:bg-white dark:focus:bg-[#1A1D23] transition-all"
              />
            </div>

            {/* Password toggle */}
            {!hasPassword && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-[18px] h-[18px] rounded-md border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] bg-white dark:bg-[#181A20] peer-checked:bg-[#6949FF] peer-checked:border-[#6949FF] transition-all duration-200 flex items-center justify-center">
                    {enablePassword && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="font-urbanist font-medium text-[14px] text-[#212121] dark:text-[#E0E0E0]">
                  Also set a password
                </span>
              </label>
            )}

            {enablePassword && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      maxLength={20}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
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

                <div className="flex flex-col gap-2">
                  <label className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      maxLength={20}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
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
              </>
            )}

            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full h-[56px] mt-4 bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-bold text-[16px] shadow-lg shadow-[#6949FF]/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : success ? (
                'Saved Successfully!'
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
