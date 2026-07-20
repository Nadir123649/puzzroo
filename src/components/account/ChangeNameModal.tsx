'use client'

import React, { useState } from 'react'
import { X, User } from 'lucide-react'
import { updateUser } from '@/lib/auth/frontend-auth'
import { notify } from '@/lib/toast'

interface ChangeNameModalProps {
  isOpen: boolean
  onClose: () => void
  currentName: string
  onNameChanged: (newName: string) => void
}

export function ChangeNameModal({ isOpen, onClose, currentName, onNameChanged }: ChangeNameModalProps) {
  const [name, setName] = useState(currentName)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const trimmed = name.trim()
    if (!trimmed) {
      setError('Full name is required')
      return
    }
    if (trimmed.length > 50) {
      setError('Full name must be at most 50 characters')
      return
    }
    if (trimmed === currentName) {
      setError('New name matches your current name')
      return
    }

    setIsLoading(true)

    try {
      const res = await updateUser({ name: trimmed })
      if (!res) {
        setError('Failed to update name. Please try again.')
        notify.errorKey('SYSTEM_GENERIC_ERROR')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      notify.successKey('ACCOUNT_NAME_UPDATED')
      onNameChanged(trimmed)
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
    } catch {
      setError('Failed to update name. Please try again.')
      notify.errorKey('SYSTEM_GENERIC_ERROR')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setName(currentName)
    setSuccess(false)
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
              <User className="w-8 h-8 text-[#6949FF]" />
            </div>
            <h2 className="font-urbanist font-bold text-[28px] text-[#212121] dark:text-white mb-2">
              Change Name
            </h2>
            <p className="font-urbanist text-[15px] text-[#757575] dark:text-[#9E9E9E]">
              Update the full name shown on your account
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
                  Name successfully changed!
                </p>
              </div>
            )}

            {/* Name Field */}
            <div className="flex flex-col gap-2">
              <label className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white">
                Full Name
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={name}
                  maxLength={50}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full h-[52px] bg-[#FAFAFA] dark:bg-[#15171C] border border-[#EEEEEE] dark:border-[#2A2D35] rounded-xl px-5 font-urbanist text-[15px] text-[#212121] dark:text-white placeholder-[#BDBDBD] dark:placeholder-[#757575] focus:outline-none focus:border-[#6949FF] dark:focus:border-[#6949FF] focus:bg-white dark:focus:bg-[#1A1D23] transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || success || !name.trim()}
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
