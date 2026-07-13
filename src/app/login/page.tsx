'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { images } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { login } from '@/lib/auth/frontend-auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Validation errors
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validate = () => {
    const newErrors: typeof errors = {}
    
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Attempt login with frontend auth
    const result = login(email, password)
    
    setIsSubmitting(false)

    if (result.success) {
      setIsSuccess(true)
      // Redirect to home after showing success message
      setTimeout(() => {
        router.push('/')
        router.refresh() // Force navbar to update
      }, 1500)
    } else {
      setErrors({ general: result.error || 'Invalid email or password' })
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
              <span className="font-urbanist text-[20px] md:text-[24px] font-extrabold tracking-tight text-[#181A20] dark:text-white">
                Puzzroo
              </span>
            </Link>
            <h2 className="font-urbanist font-bold text-[20px] text-[#212121] dark:text-white">
              Log in to your account
            </h2>
          </div>

          {isSuccess ? (
            <div className="text-center py-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-[#22C55E] rounded-full flex items-center justify-center text-white text-2xl font-bold animate-bounce">
                ✓
              </div>
              <p className="font-urbanist font-semibold text-[16px] text-[#22C55E]">
                Login Successful! Redirecting...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* General Error Message */}
              {errors.general && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="font-urbanist font-semibold text-[14px] text-red-600 dark:text-red-400 text-center">
                    {errors.general}
                  </p>
                </div>
              )}

              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="font-urbanist font-bold text-[14px] text-[#424242] dark:text-[#E0E0E0]">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                  }}
                  className={`w-full h-[48px] px-4 rounded-xl border font-urbanist text-[15px] bg-white dark:bg-[#181A20] text-[#212121] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:border-transparent transition-all duration-200 ${
                    errors.email ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E0E0] dark:border-[#35383F]'
                  }`}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <span className="font-urbanist font-semibold text-[12px] text-red-500">
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="font-urbanist font-bold text-[14px] text-[#424242] dark:text-[#E0E0E0]">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="font-urbanist font-semibold text-[13px] text-[#6949FF] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                    }}
                    className={`w-full h-[48px] pl-4 pr-11 rounded-xl border font-urbanist text-[15px] bg-white dark:bg-[#181A20] text-[#212121] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:border-transparent transition-all duration-200 ${
                      errors.password ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E0E0] dark:border-[#35383F]'
                    }`}
                    placeholder="••••••••"
                    autoComplete="current-password"
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

              {/* Submit button */}
              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full h-[48px] rounded-full text-base font-urbanist font-semibold bg-[#6949FF] hover:bg-[#5536E6]"
              >
                Log In
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="h-[1px] flex-grow bg-[#E0E0E0] dark:bg-[#35383F]" />
                <span className="font-urbanist text-xs text-[#757575] dark:text-[#9E9E9E] font-medium uppercase tracking-wider">or</span>
                <div className="h-[1px] flex-grow bg-[#E0E0E0] dark:bg-[#35383F]" />
              </div>

              {/* Google Login */}
              <button
                type="button"
                onClick={async () => {
                  setIsSubmitting(true)
                  await new Promise(resolve => setTimeout(resolve, 800))
                  localStorage.setItem('puzzroo_auth', 'true')
                  localStorage.setItem('puzzroo_user', JSON.stringify({
                    id: '69f9e8eaacc567cc2a27db28',
                    name: 'Abdul Raheem',
                    email: 'abdulraheem55jutt@gmail.com',
                    username: 'abdulraheem',
                    joinedDate: '5 May 2026',
                    accountStatus: 'active',
                    subscriptionPlan: 'free',
                  }))
                  window.dispatchEvent(new Event('auth-change'))
                  setIsSubmitting(false)
                  setIsSuccess(true)
                  setTimeout(() => {
                    router.push('/')
                    router.refresh()
                  }, 1500)
                }}
                className="w-full h-[48px] rounded-full border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] hover:bg-[#F5F6FA] dark:hover:bg-[#35383F] bg-transparent text-[#212121] dark:text-white font-urbanist font-bold text-[15px] flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Signup Redirect */}
              <div className="text-center pt-2">
                <span className="font-urbanist font-medium text-[14px] text-[#757575] dark:text-[#BDBDBD]">
                  Don't have an account?{' '}
                  <Link href="/signup" className="font-semibold text-[#6949FF] hover:underline">
                    Sign up
                  </Link>
                </span>
              </div>
            </form>
          )}

        </div>
      </main>
      
      <Footer />
    </div>
  )
}
