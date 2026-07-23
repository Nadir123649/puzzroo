'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '../../hooks/use-theme'
import { images } from '@/lib/utils'
import { isLoggedIn, getCurrentUser, logout } from '@/lib/auth/frontend-auth'
import { notify } from '@/lib/toast'
import { ProfileDropdown } from './ProfileDropdown'

let globalMounted = false

export function Navbar() {
  const { theme, toggleTheme, mounted } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Initialise synchronously from localStorage so the very first render already
  // shows the correct auth state — this prevents the "Sign up/Login" ↔ "Subscribe/Profile"
  // width-difference from flashing and shifting the navbar on every navigation.
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !globalMounted) return false
    return isLoggedIn()
  })
  const [user, setUser] = useState<{ name: string; email: string } | null>(() => {
    if (typeof window === 'undefined' || !globalMounted) return null
    const userData = getCurrentUser()
    if (!userData) return null
    return { name: userData.name || userData.username, email: userData.email }
  })

  const [navbarMounted, setNavbarMounted] = useState(globalMounted)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    globalMounted = true
    setNavbarMounted(true)

    const checkAuth = () => {
      const isAuth = isLoggedIn()
      setLoggedIn(isAuth)

      if (isAuth) {
        const userData = getCurrentUser()
        if (userData) {
          setUser({
            name: userData.name || userData.username,
            email: userData.email,
          })
        }
      } else {
        setUser(null)
      }
    }

    checkAuth()

    window.addEventListener('storage', checkAuth)
    window.addEventListener('auth-change', checkAuth)
    return () => {
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('auth-change', checkAuth)
    }
  }, [])

  // Sync auth state on page navigation
  useEffect(() => {
    const isAuth = isLoggedIn()
    setLoggedIn(isAuth)
    if (isAuth) {
      const userData = getCurrentUser()
      if (userData) {
        setUser({
          name: userData.name || userData.username,
          email: userData.email,
        })
      }
    } else {
      setUser(null)
    }
  }, [pathname])

  return (
    <header className="sticky top-0 w-full bg-white dark:bg-[#181A20] transition-colors duration-300 z-[200]">
      <div className="w-full max-w-[1380px] mx-auto px-[20px] py-[8px] md:py-[22px]">
        <div className="w-full flex items-center justify-between h-[48px]">

          {/* LEFT: Logo + Brand */}
          <div className="flex items-center gap-[clamp(8px,1vw,12px)] select-none">
            <Link 
              href="/" 
              className="flex items-center gap-[clamp(8px,1vw,12px)] cursor-pointer"
              onClick={(e) => {
                if (pathname === '/') {
                  e.preventDefault()
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  })
                }
              }}
            >
              <svg 
                viewBox="0 0 37 37" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 md:w-8 md:h-8 rounded-lg"
              >
                <path d="M23.0562 16.7426C24.2701 16.042 24.2701 14.2913 23.0562 13.5908L17.1366 10.1753C15.9227 9.47472 14.405 10.3508 14.405 11.7519V18.5814C14.405 19.9825 15.9227 20.8586 17.1366 20.158L23.0562 16.7426Z" fill="url(#paint0_linear_2380_2069)"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M27.5315 30.4851C32.0394 30.5303 35.8181 27.0727 36.1827 22.6137C36.3524 20.041 36.4191 17.4557 36.3954 14.8712C36.3746 12.6103 36.2857 10.3493 36.1367 8.09876C35.97 6.08 35.0829 4.18861 33.6371 2.76821C32.1913 1.34856 30.2831 0.495435 28.26 0.364356C25.0274 0.0910889 21.6126 0 18.1978 0C14.783 0 11.3682 0.0910889 8.18086 0.318441C6.15775 0.44952 4.24952 1.30339 2.8037 2.72304C1.35789 4.14269 0.470835 6.03482 0.304096 8.05359C-0.0597661 12.922 -0.105712 17.7453 0.212945 22.6137C0.387836 24.7769 1.3779 26.7935 2.98452 28.2553C4.59041 29.7164 6.69206 30.5133 8.86412 30.4851H13.6447V36.4L22.7509 30.4851H27.5315ZM13.6447 30.4851V24.5703H8.86412C7.45239 24.6155 6.22297 23.6142 6.08661 22.2042C5.81316 17.6542 5.85911 13.1042 6.17776 8.55421C6.23038 7.81439 6.58979 7.18269 7.13151 6.76427C7.52353 6.46213 8.01041 6.2718 8.54546 6.23329C11.6416 6.00594 14.9193 5.91485 18.1978 5.91485C21.4763 5.91485 24.754 6.05186 27.8502 6.18812C29.0796 6.27921 30.1267 7.23453 30.2179 8.50829C30.5825 13.0583 30.5825 17.6083 30.309 22.1583C30.1267 23.5691 28.9432 24.6155 27.5315 24.5703H22.7509L13.6447 30.4851Z" fill="url(#paint1_linear_2380_2069)"/>
                <defs>
                  <linearGradient id="paint0_linear_2380_2069" x1="36.4" y1="36.4" x2="-6.91273" y2="23.8419" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6949FF"/>
                    <stop offset="1" stopColor="#876DFF"/>
                  </linearGradient>
                  <linearGradient id="paint1_linear_2380_2069" x1="36.4" y1="36.4" x2="-6.91273" y2="23.8419" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6949FF"/>
                    <stop offset="1" stopColor="#876DFF"/>
                  </linearGradient>
                </defs>
              </svg>

              <span className="font-urbanist text-[24px] font-extrabold text-[clamp(20px,2.5vw,40px)] tracking-tight text-[#181A20] dark:text-white transition-colors duration-300">
                Puzzroo
              </span>
            </Link>
          </div>

          {/* RIGHT: Desktop Actions */}
          <div className="hidden md:flex items-center gap-[clamp(8px,1vw,16px)] -mr-[15px]">
            {(loggedIn && user) ? (
              <>
                <Link href="/subscription" className="inline-flex items-center justify-center h-[38px] px-[clamp(16px,2vw,24px)] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[16px] font-semibold font-urbanist transition-all duration-200 active:scale-95">
                  Subscribe Us
                </Link>

                <ProfileDropdown userName={user.name} userEmail={user.email} />
              </>
            ) : (
              <>
                <Link href="/signup" className="inline-flex items-center justify-center h-[38px] px-[clamp(16px,2vw,24px)] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[16px] font-semibold font-urbanist transition-all duration-200 active:scale-95">
                  Sign up
                </Link>

                <Link href="/login" className="inline-flex items-center justify-center h-[38px] px-[clamp(16px,2vw,24px)] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[16px] font-semibold font-urbanist transition-all duration-200 active:scale-95">
                  Login
                </Link>
              </>
            )}

            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 h-[38px] px-[clamp(12px,2vw,16px)] rounded-full hover:opacity-80 transition-all duration-200 active:scale-95"
              aria-label="Toggle theme"
            >
              <span className="font-urbanist text-[14px] font-medium text-[#181A20] dark:text-white transition-colors duration-300">
                {mounted && theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
              <img
                src={images.darkIcon}
                alt="Theme icon"
                width={20}
                height={20}
                className={`w-5 h-5 select-none transition-transform duration-500 ${mounted && theme === 'light' ? 'scale-x-[-1]' : ''
                  }`}
              />
            </button>

          </div>

          {/* RIGHT: Mobile Actions - Theme + Hamburger */}
          <div className="flex md:hidden items-center gap-2 ml-[20px]">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:opacity-80 transition-all duration-200 active:scale-95"
              aria-label="Toggle theme"
            >
              <img
                src={images.darkIcon}
                alt="Theme icon"
                width={20}
                height={20}
                className={`w-5 h-5 select-none transition-transform duration-500 ${mounted && theme === 'light' ? 'scale-x-[-1]' : ''
                  }`}
              />
            </button>

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
                  notify.successKey('AUTH_LOGOUT_SUCCESS')
                  setIsMenuOpen(false)
                  router.push('/login')
                  router.refresh()
                }}
                className="font-urbanist font-semibold text-[15px] text-red-600 dark:text-red-400 text-left py-1"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center w-full h-[40px] rounded-full bg-[#6949FF] text-white text-[16px] font-semibold font-urbanist transition-all duration-200">
                Sign up
              </Link>
              <Link href="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center w-full h-[40px] rounded-full border border-[#6949FF] text-[#6949FF] dark:text-white text-[16px] font-semibold font-urbanist transition-all duration-200">
                Login
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}

export default Navbar
