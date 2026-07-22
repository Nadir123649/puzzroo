'use client'

import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { notify } from '@/lib/toast'
import { deleteAccount } from '@/lib/auth/frontend-auth'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteAccountModal({ isOpen, onClose, onDeleted }: DeleteAccountModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  if (!isOpen) return null

  const handleClose = () => {
    setConfirmed(false)
    setIsLoading(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!confirmed) return
    setIsLoading(true)
    try {
      const res = await deleteAccount()
      if (!res.success) {
        notify.errorFromResult(res, 'ACCOUNT_DELETE_FAILED')
        setIsLoading(false)
        return
      }
      notify.successKey('ACCOUNT_DELETED')
      setIsLoading(false)
      setConfirmed(false)
      if (onDeleted) onDeleted()
      else handleClose()
    } catch {
      notify.errorKey('ACCOUNT_DELETE_FAILED_RETRY')
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-black/60 dark:bg-black/80 animate-fadeIn overflow-y-auto">
      <div
        className="w-full max-w-[480px] bg-white dark:bg-[#1A1D23] rounded-3xl shadow-2xl relative overflow-hidden animate-slideUp my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 to-red-600" />

        <button
          onClick={handleClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#2A2D35] dark:hover:bg-[#35383F] text-gray-500 dark:text-gray-400 transition-colors z-10"
          aria-label="Close modal"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="p-4 sm:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-5 border border-red-100 dark:border-red-500/20 shadow-sm">
               <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <h2 className="font-urbanist font-extrabold text-[28px] text-red-600 dark:text-red-500 mb-2">
              Delete Account
            </h2>
            <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#9E9E9E]">
              This permanently removes your account and all associated data. This action cannot be undone.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none mb-6 p-3 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-xl">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 accent-red-600 cursor-pointer"
            />
            <span className="font-urbanist text-[13px] text-[#616161] dark:text-[#BDBDBD] text-left">
              I understand that deleting my account is permanent and all my data will be lost.
            </span>
          </label>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!confirmed || isLoading}
              className="w-full h-[56px] bg-red-600 hover:bg-red-700 text-white rounded-full font-urbanist font-bold text-[16px] shadow-lg shadow-red-500/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete My Account'
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full h-[48px] bg-gray-100 dark:bg-[#2A2D35] hover:bg-gray-200 dark:hover:bg-[#35383F] text-[#424242] dark:text-[#E0E0E0] rounded-full font-urbanist font-semibold text-[15px] transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
