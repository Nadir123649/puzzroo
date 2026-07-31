'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, CreditCard, Bell, History, LogOut, Activity, Sun, Moon } from 'lucide-react'
import { logout, getCurrentUser } from '@/lib/auth/frontend-auth'
import { notify } from '@/lib/toast'
import { useTheme } from '../../hooks/use-theme'

interface ProfileDropdownProps {
  userName: string
  userEmail: string
  userAvatar?: string | null
}

export function ProfileDropdown({ userName, userEmail, userAvatar }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const syncRole = () => setIsAdmin(getCurrentUser()?.role === 'admin')
    syncRole()
    window.addEventListener('auth-change', syncRole)
    return () => window.removeEventListener('auth-change', syncRole)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    await logout()
    notify.successKey('AUTH_LOGOUT_SUCCESS')
    setIsOpen(false)
    window.location.replace('/login')
  }

  // Truncate name if too long
  const displayName = userName.length > 15 ? `${userName.substring(0, 12)}...` : userName

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 h-[38px] px-3 rounded-full hover:bg-gray-100 dark:hover:bg-[#1F222A] transition-all duration-200 active:scale-95 mr-1.5"
        aria-label="Profile menu"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#6949FF] flex items-center justify-center text-white overflow-hidden">
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={18} strokeWidth={2.5} />
          )}
        </div>
        
        {/* Name */}
        <span className="font-urbanist font-semibold text-[15px] text-[#212121] dark:text-white transition-colors duration-300">
          {displayName}
        </span>

        {/* Dropdown Arrow */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#212121] dark:text-white transition-colors duration-300"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[240px] bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] shadow-xl shadow-purple-500/10 overflow-hidden z-50 animate-slideDown">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-[#E0E0E0] dark:border-[#35383F] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6949FF] flex items-center justify-center text-white overflow-hidden shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={18} strokeWidth={2.5} />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-urbanist font-bold text-[15px] text-[#212121] dark:text-white truncate transition-colors duration-300">
                {userName || "User"}
              </p>
              <p className="font-urbanist text-[13px] text-[#757575] dark:text-[#BDBDBD] truncate transition-colors duration-300">
                {userEmail || ""}
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/account-information"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#181A20] transition-colors duration-150"
            >
              <User size={18} className="text-[#6949FF]" strokeWidth={2} />
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white transition-colors duration-300">
                Account
              </span>
            </Link>

            <Link
              href="/subscription"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#181A20] transition-colors duration-150"
            >
              <CreditCard size={18} className="text-[#6949FF]" strokeWidth={2} />
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white transition-colors duration-300">
                Subscription
              </span>
            </Link>

            <Link
              href="/email-preferences"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#181A20] transition-colors duration-150"
            >
              <Bell size={18} className="text-[#6949FF]" strokeWidth={2} />
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white transition-colors duration-300">
                Updates
              </span>
            </Link>

            <Link
              href="/billing-history"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#181A20] transition-colors duration-150"
            >
              <History size={18} className="text-[#6949FF]" strokeWidth={2} />
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white transition-colors duration-300">
                Billing History
              </span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin/tracking"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#181A20] transition-colors duration-150"
              >
                <Activity size={18} className="text-[#6949FF]" strokeWidth={2} />
                <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white transition-colors duration-300">
                  User Tracking
                </span>
              </Link>
            )}

            <button
              onClick={() => {
                toggleTheme()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-[#181A20] transition-colors duration-150 text-left"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-[#6949FF]" strokeWidth={2} />
              ) : (
                <Moon size={18} className="text-[#6949FF]" strokeWidth={2} />
              )}
              <span className="font-urbanist font-semibold text-[14px] text-[#212121] dark:text-white transition-colors duration-300">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-[#E0E0E0] dark:border-[#35383F] py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
            >
              <LogOut size={18} className="text-red-600 dark:text-red-400" strokeWidth={2} />
              <span className="font-urbanist font-semibold text-[14px] text-red-600 dark:text-red-400 transition-colors duration-300">
                Logout
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
