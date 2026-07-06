'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User, CreditCard, Bell, History, LogOut, X, Menu, type LucideIcon } from 'lucide-react'
import { logout } from '@/lib/auth/frontend-auth'

interface MenuItem {
  href: string
  label: string
  icon: LucideIcon
}

const menuItems: MenuItem[] = [
  {
    href: '/account-information',
    label: 'Account Information',
    icon: User,
  },
  {
    href: '/subscription',
    label: 'Subscription',
    icon: CreditCard,
  },
  {
    href: '/email-preferences',
    label: 'Email Preferences',
    icon: Bell,
  },
  {
    href: '/billing-history',
    label: 'Billing History',
    icon: History,
  },
]

export function AccountSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Mobile Menu Button - LEFT SIDE */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed bottom-6 left-6 z-40 w-14 h-14 bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 active:scale-95 transition-all duration-200"
        aria-label="Open menu"
      >
        <Menu size={24} strokeWidth={2.5} />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50 animate-fadeIn"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[280px] flex-shrink-0">
        <div className="sticky top-[80px]">
          <nav className="bg-gradient-to-br from-white via-purple-50/20 to-purple-50/40 dark:from-[#1A1D23] dark:via-[#1A1D23] dark:to-[#1A1D23] rounded-xl border border-purple-100/50 dark:border-[#2A2D35] overflow-hidden shadow-sm shadow-purple-500/5 h-[90vh] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-5 py-4 transition-all duration-200 border-l-4 ${
                      active
                        ? 'bg-gradient-to-r from-purple-100/70 via-purple-50/50 to-transparent dark:from-[#6949FF]/15 dark:via-[#6949FF]/8 dark:to-transparent border-l-[#6949FF] text-[#6949FF] font-semibold'
                        : 'border-l-transparent text-[#616161] dark:text-[#9E9E9E] hover:bg-purple-50/30 dark:hover:bg-[#6949FF]/5 font-medium'
                    }`}
                  >
                    <Icon size={20} strokeWidth={2} />
                    <span className="font-urbanist text-[15px]">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-4 text-[#616161] dark:text-[#9E9E9E] hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 border-t border-purple-100/50 dark:border-[#2A2D35] font-medium"
            >
              <LogOut size={20} strokeWidth={2} />
              <span className="font-urbanist text-[15px]">
                Logout
              </span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Mobile Drawer - SLIDE FROM LEFT with Glassmorphism */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-[280px] backdrop-blur-xl bg-gradient-to-br from-white via-purple-50/90 to-purple-100/90 dark:bg-none dark:bg-[#1A1D23]/95 border-r border-purple-200/80 dark:border-purple-500/30 z-50 transition-transform duration-300 shadow-2xl shadow-purple-500/10 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button */}
        <div className="flex items-center justify-between p-5 border-b border-purple-200/50 dark:border-purple-500/20 backdrop-blur-sm">
          <h2 className="font-urbanist font-bold text-[18px] bg-gradient-to-r from-[#6949FF] to-[#8B5CF6] bg-clip-text text-transparent">
            Account Menu
          </h2>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-500/10 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} className="text-[#6949FF]" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="py-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-5 py-4 transition-all duration-200 border-l-4 ${
                  active
                    ? 'bg-gradient-to-r from-purple-100/70 to-purple-50/50 dark:from-purple-500/20 dark:to-purple-500/10 border-l-[#6949FF] text-[#6949FF] font-semibold shadow-sm shadow-purple-500/10'
                    : 'border-l-transparent text-[#616161] dark:text-[#9E9E9E] hover:bg-purple-50/50 dark:hover:bg-purple-500/5 font-medium'
                }`}
              >
                <Icon size={20} strokeWidth={2} />
                <span className="font-urbanist text-[15px]">
                  {item.label}
                </span>
              </Link>
            )
          })}
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 text-[#616161] dark:text-[#9E9E9E] hover:bg-red-50/70 dark:hover:bg-red-900/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 border-t border-purple-200/50 dark:border-purple-500/20 mt-2 font-medium"
          >
            <LogOut size={20} strokeWidth={2} />
            <span className="font-urbanist text-[15px]">
              Logout
            </span>
          </button>
        </nav>
      </aside>
    </>
  )
}
