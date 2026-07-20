'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, X, Lock } from 'lucide-react'
import { notify } from '@/lib/toast'
import { images } from '@/lib/utils'
import { changePassword, forgotPassword, getCurrentUser } from '@/lib/auth/frontend-auth'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  if (!isOpen) return null

  const handleForgotPassword = async () => {
    const user = getCurrentUser()
    if (!user?.email) {
      setError('No email is associated with this account')
      return
    }
    setError('')
    setForgotLoading(true)
    try {
      const res = await forgotPassword(user.email)
      if (res.success) {
        setForgotSent(true)
        notify.successKey('ACCOUNT_RESET_LINK_SENT')
      } else {
        setError(res.error || 'Failed to send reset email')
        notify.errorFromResult(res, 'ACCOUNT_RESET_EMAIL_FAILED')
      }
    } catch {
      setError('Failed to send reset email. Please try again.')
      notify.errorKey('ACCOUNT_RESET_EMAIL_FAILED_RETRY')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (newPassword.length > 16) {
      setError('Password must be at most 16 characters long')
      return
    }

    if (newPassword === currentPassword) {
      setError('You are already using this password. Please choose a different password.')
      return
    }

    setIsLoading(true)

    try {
      const res = await changePassword(currentPassword, newPassword)
      if (!res.success) {
        setError(res.error || 'Failed to change password')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError('Failed to change password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess(false)
    setForgotSent(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/60 dark:bg-black/80 animate-fadeIn overflow-y-auto">
      <div 
        className="w-full max-w-[480px] bg-white dark:bg-[#1A1D23] rounded-3xl shadow-2xl relative overflow-hidden animate-slideUp my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-[#6949FF] to-[#8B5CF6]" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#2A2D35] dark:hover:bg-[#35383F] text-gray-500 dark:text-gray-400 transition-colors z-10"
          aria-label="Close modal"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="p-4 sm:p-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-purple-50 dark:bg-[#6949FF]/10 rounded-2xl flex items-center justify-center mb-5 border border-purple-100 dark:border-[#6949FF]/20 shadow-sm">
              <Lock className="w-8 h-8 text-[#6949FF]" />
            </div>
            <h2 className="font-urbanist font-bold text-[28px] text-[#212121] dark:text-white mb-2">
              Change Password
            </h2>
            <p className="font-urbanist text-[15px] text-[#757575] dark:text-[#9E9E9E]">
              Create a strong and secure new password
            </p>
          </div>

          {/* Form */}
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
                  Password successfully changed!
                </p>
              </div>
            )}

            {forgotSent && (
              <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-xl">
                <p className="font-urbanist text-[14px] font-semibold text-green-600 dark:text-green-400 text-center">
                  We've emailed you a password reset link. Check your inbox.
                </p>
              </div>
            )}

            {/* Current Password Field */}
            <div className="flex flex-col gap-2">
              <label className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                Current Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full h-[52px] bg-[#FAFAFA] dark:bg-[#15171C] border border-[#EEEEEE] dark:border-[#2A2D35] rounded-xl px-5 font-urbanist text-[15px] text-[#212121] dark:text-white placeholder-[#BDBDBD] dark:placeholder-[#757575] focus:outline-none focus:border-[#6949FF] dark:focus:border-[#6949FF] focus:bg-white dark:focus:bg-[#1A1D23] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 text-[#9E9E9E] hover:text-[#212121] dark:hover:text-white transition-colors"
                >
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="font-urbanist font-semibold text-[13px] text-[#6949FF] hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? 'Sending reset link…' : 'Forgot password?'}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="flex flex-col gap-2">
              <label className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  maxLength={16}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full h-[52px] bg-[#FAFAFA] dark:bg-[#15171C] border border-[#EEEEEE] dark:border-[#2A2D35] rounded-xl px-5 font-urbanist text-[15px] text-[#212121] dark:text-white placeholder-[#BDBDBD] dark:placeholder-[#757575] focus:outline-none focus:border-[#6949FF] dark:focus:border-[#6949FF] focus:bg-white dark:focus:bg-[#1A1D23] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 text-[#9E9E9E] hover:text-[#212121] dark:hover:text-white transition-colors"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-2">
              <label className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  maxLength={16}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || success || !currentPassword || !newPassword || !confirmPassword}
              className="w-full h-[56px] mt-4 bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-bold text-[16px] shadow-lg shadow-[#6949FF]/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : success ? (
                'Updated Successfully!'
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
