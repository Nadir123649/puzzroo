'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '../../hooks/use-theme'
import { images } from '@/lib/utils'
import { isLoggedIn, getCurrentUser, logout } from '@/lib/auth/frontend-auth'
import { ProfileDropdown } from './ProfileDropdown'

// Module-level global cache to persist state across SPA page navigations without resetting
let globalLoggedIn: boolean | null = null
let globalUser: { name: string; email: string } | null = null
let globalNavbarMounted = false

export function Navbar() {
  const { theme, toggleTheme, mounted } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(() => {
    if (globalLoggedIn !== null) return globalLoggedIn
    return false
  })
  const [user, setUser] = useState<{ name: string; email: string } | null>(() => {
    if (globalUser !== null) return globalUser
    return null
  })
  const [navbarMounted, setNavbarMounted] = useState(() => globalNavbarMounted)
  const pathname = usePathname()
  const router = useRouter()

  // Check login status on mount, when component updates, and when pathname changes
  useEffect(() => {
    globalNavbarMounted = true
    setNavbarMounted(true)

    const checkAuth = () => {
      const isAuth = isLoggedIn()
      globalLoggedIn = isAuth
      setLoggedIn(isAuth)
      
      if (isAuth) {
        const userData = getCurrentUser()
        if (userData) {
          const u = {
            name: userData.name,
            email: userData.email,
          }
          globalUser = u
          setUser(u)
        }
      } else {
        globalUser = null
        setUser(null)
      }
    }

    checkAuth()
    
    // Listen for storage changes (login/logout in other tabs) and custom auth changes
    window.addEventListener('storage', checkAuth)
    window.addEventListener('auth-change', checkAuth)
    return () => {
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('auth-change', checkAuth)
    }
  }, [pathname])

  return (
    <header className="sticky top-0 w-full bg-white dark:bg-[#181A20] transition-colors duration-300 z-[200]">
      <div className="w-full max-w-[1380px] mx-auto px-[20px] py-[8px] md:py-[22px]">
        <div className="w-full flex items-center justify-between h-[48px]">

          {/* LEFT: Logo + Brand */}
          <div className="flex items-center gap-[clamp(8px,1vw,12px)] select-none">
            <Link href="/" className="flex items-center gap-[clamp(8px,1vw,12px)] cursor-pointer">
              <Image
                src={images.logo}
                alt="Puzzroo Logo"
                width={32}
                height={32}
                className="w-6 h-6 md:w-8 md:h-8 rounded-lg"
                priority
              />

              <span className="font-urbanist text-[24px] font-extrabold text-[clamp(20px,2.5vw,40px)] tracking-tight text-[#181A20] dark:text-white transition-colors duration-300">
                Puzzroo
              </span>
            </Link>
          </div>

          {/* RIGHT: Desktop Actions */}
          <div className="hidden md:flex items-center gap-[clamp(8px,1vw,16px)] -mr-[15px]">
            {navbarMounted ? (
              loggedIn && user ? (
                <>
                  {/* Subscribe Button */}
                  <Link href="/subscription">
                    <button className="h-[38px] px-[clamp(16px,2vw,24px)] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[16px] font-semibold font-urbanist transition-all duration-200 active:scale-95">
                      Subscribe Us
                    </button>
                  </Link>

                  {/* Profile Dropdown */}
                  <ProfileDropdown userName={user.name} userEmail={user.email} />
                </>
              ) : (
                <>
                  <Link href="/signup">
                    <button className="h-[38px] px-[clamp(16px,2vw,24px)] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[16px] font-semibold font-urbanist transition-all duration-200 active:scale-95">
                      Sign up
                    </button>
                  </Link>

                  <Link href="/login">
                    <button className="h-[38px] px-[clamp(16px,2vw,24px)] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[16px] font-semibold font-urbanist transition-all duration-200 active:scale-95">
                      Login
                    </button>
                  </Link>
                </>
              )
            ) : (
              // Hydration Placeholder to prevent layouts jumping on first load
              <div className="h-[38px] w-[180px]" />
            )}

            {navbarMounted && (
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center gap-2 h-[38px] px-[clamp(12px,2vw,16px)] rounded-full hover:opacity-80 transition-all duration-200 active:scale-95"
                aria-label="Toggle theme"
              >
                <span className="font-urbanist text-[14px] font-medium text-[#181A20] dark:text-white transition-colors duration-300">
                  {mounted && theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
                <Image
                  src={images.darkIcon}
                  alt="Theme icon"
                  width={20}
                  height={20}
                  className={`w-5 h-5 select-none transition-transform duration-500 ${mounted && theme === 'light' ? 'scale-x-[-1]' : ''
                    }`}
                />
              </button>
            )}

          </div>

          {/* RIGHT: Mobile Actions - Theme + Hamburger */}
          <div className="flex md:hidden items-center gap-2 ml-[20px]">
            {navbarMounted && (
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:opacity-80 transition-all duration-200 active:scale-95"
                aria-label="Toggle theme"
              >
                <Image
                  src={images.darkIcon}
                  alt="Theme icon"
                  width={20}
                  height={20}
                  className={`w-5 h-5 select-none transition-transform duration-500 ${mounted && theme === 'light' ? 'scale-x-[-1]' : ''
                    }`}
                />
              </button>
            )}

            {/* Hamburger Menu */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-lg ml-2"
              aria-label="Toggle menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`w-full h-0.5 bg-[#212121] dark:bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`w-full h-0.5 bg-[#212121] dark:bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`w-full h-0.5 bg-[#212121] dark:bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>

        </div>
      </div>
      {/* Mobile Menu Dropdown */}
      {isMenuOpen && navbarMounted && (
        <div className="md:hidden w-full bg-white dark:bg-[#181A20] px-[20px] pb-4 flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 transition-all duration-300">
          {loggedIn && user ? (
            <>
              <div className="py-2 border-b border-gray-100 dark:border-gray-800">
                <p className="font-urbanist font-bold text-[16px] text-[#212121] dark:text-white truncate">
                  {user.name}
                </p>
                <p className="font-urbanist text-[13px] text-[#757575] dark:text-[#BDBDBD] truncate">
                  {user.email}
                </p>
              </div>
              <Link href="/account-information" onClick={() => setIsMenuOpen(false)} className="font-urbanist font-semibold text-[15px] py-1 text-[#212121] dark:text-white">
                Account
              </Link>
              <Link href="/subscription" onClick={() => setIsMenuOpen(false)} className="font-urbanist font-semibold text-[15px] py-1 text-[#212121] dark:text-white">
                Subscription
              </Link>
              <button
                onClick={() => {
                  logout()
                  setIsMenuOpen(false)
                  router.push('/')
                  router.refresh()
                }}
                className="font-urbanist font-semibold text-[15px] text-red-600 dark:text-red-400 text-left py-1"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" onClick={() => setIsMenuOpen(false)}>
                <button className="w-full h-[40px] rounded-full bg-[#6949FF] text-white text-[16px] font-semibold font-urbanist transition-all duration-200">
                  Sign up
                </button>
              </Link>
              <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                <button className="w-full h-[40px] rounded-full border border-[#6949FF] text-[#6949FF] dark:text-white text-[16px] font-semibold font-urbanist transition-all duration-200">
                  Login
                </button>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
