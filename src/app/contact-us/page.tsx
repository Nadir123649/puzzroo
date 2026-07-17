'use client'

import React, { useState } from 'react'
import { InfoPageLayout } from '@/components/layout/InfoPageLayout'
import { Button } from '@/components/ui/button'
import { Mail, Clock, ShieldCheck, Send } from 'lucide-react'
import { submitContact } from '@/lib/auth/frontend-auth'

export default function ContactUsPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  
  // Errors state
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({})
  
  // Success state
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address'
    }
    if (!message.trim()) {
      newErrors.message = 'Message is required'
    } else if (message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    const result = await submitContact(name, email, message)
    setIsSubmitting(false)
    if (result.success) {
      setIsSubmitted(true)
    } else {
      setErrors({ email: result.error })
    }
  }

  const handleReset = () => {
    setName('')
    setEmail('')
    setMessage('')
    setErrors({})
    setIsSubmitted(false)
  }

  return (
    <InfoPageLayout title="Contact Us">
      <div className="w-full pb-[40px] px-1 md:px-0">
        
        {/* Subtitle */}
        <p className="font-urbanist font-medium text-[15px] md:text-[17px] leading-[150%] text-[#757575] dark:text-[#BDBDBD] mb-8 text-center max-w-[600px] mx-auto">
          Have a question, encountered a bug, or want to suggest a new puzzle feature? 
          Drop us a line and we'll get back to you!
        </p>

        {isSubmitted ? (
          <div className="bg-white dark:bg-[#1F222A] rounded-[24px] p-8 text-center flex flex-col items-center gap-6 border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] shadow-lg shadow-purple-500/5 max-w-[560px] mx-auto transition-all duration-300">
            <div className="w-16 h-16 bg-[#22C55E] rounded-full flex items-center justify-center text-white text-3xl font-bold animate-bounce shadow-lg shadow-green-500/20">
              ✓
            </div>
            <div>
              <h2 className="font-urbanist font-bold text-[24px] text-[#212121] dark:text-white mb-2">
                Thank You!
              </h2>
              <p className="font-urbanist font-medium text-[16px] text-[#757575] dark:text-[#BDBDBD]">
                Your message has been sent successfully. The Puzzroo team will get back to you as soon as possible.
              </p>
            </div>
            <button 
              onClick={handleReset} 
              className="w-full max-w-[240px] h-[46px] bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-95"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Column: Info Cards */}
            <div className="md:col-span-5 flex flex-col gap-4">
              
              {/* Contact Card */}
              <div className="bg-gradient-to-br from-white to-[#F0EDFF]/30 dark:from-[#1F222A] dark:to-[#1F222A] border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] rounded-2xl p-5 shadow-sm">
                <h3 className="font-urbanist font-bold text-[16px] text-[#212121] dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#6949FF] rounded-full inline-block"></span>
                  Support Info
                </h3>
                
                <div className="space-y-4">
                  {/* Email */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <Mail size={16} className="text-[#6949FF]" />
                    </div>
                    <div>
                      <p className="font-urbanist text-[11px] font-bold text-[#757575] dark:text-[#BDBDBD] uppercase tracking-wide">
                        Email Us
                      </p>
                      <a href="mailto:support@puzzroo.com" className="font-urbanist font-bold text-[14px] text-[#6949FF] hover:underline">
                        support@puzzroo.com
                      </a>
                    </div>
                  </div>

                  {/* Response Time */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <Clock size={16} className="text-[#6949FF]" />
                    </div>
                    <div>
                      <p className="font-urbanist text-[11px] font-bold text-[#757575] dark:text-[#BDBDBD] uppercase tracking-wide">
                        Response Time
                      </p>
                      <p className="font-urbanist font-bold text-[14px] text-[#424242] dark:text-[#E0E0E0]">
                        Within 24 hours
                      </p>
                    </div>
                  </div>

                  {/* Operational Hours */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={16} className="text-[#6949FF]" />
                    </div>
                    <div>
                      <p className="font-urbanist text-[11px] font-bold text-[#757575] dark:text-[#BDBDBD] uppercase tracking-wide">
                        Operating Hours
                      </p>
                      <p className="font-urbanist font-bold text-[14px] text-[#424242] dark:text-[#E0E0E0]">
                        Mon - Fri, 9am - 5pm EST
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="bg-[#6949FF]/5 dark:bg-[#6949FF]/10 border border-[#6949FF]/20 rounded-2xl p-5">
                <h4 className="font-urbanist font-bold text-[14px] text-[#6949FF] mb-1">
                  💡 Frequently Asked Questions
                </h4>
                <p className="font-urbanist text-[13px] text-[#424242] dark:text-[#E0E0E0] leading-relaxed">
                  Before sending a message, you might find a quick answer in our{' '}
                  <a href="/faq" className="font-bold underline hover:text-[#5536E6] transition-colors">
                    FAQ section
                  </a>.
                </p>
              </div>

            </div>

            {/* Right Column: Contact Form */}
            <div className="md:col-span-7 bg-[#FFFFFF] dark:bg-[#1F222A] rounded-2xl p-5 border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] shadow-lg shadow-purple-500/5">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name field */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="font-urbanist font-bold text-[13px] text-[#424242] dark:text-[#E0E0E0]">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (errors.name) setErrors(prev => ({ ...prev, name: undefined }))
                    }}
                    className={`w-full h-[46px] px-4 rounded-xl border font-urbanist text-[14px] bg-white dark:bg-[#181A20] text-[#212121] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:border-transparent transition-all duration-200 ${
                      errors.name ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E0E0] dark:border-[#35383F]'
                    }`}
                    placeholder="Enter your name"
                  />
                  {errors.name && (
                    <span className="font-urbanist font-semibold text-[12px] text-red-500">
                      {errors.name}
                    </span>
                  )}
                </div>

                {/* Email field */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="font-urbanist font-bold text-[13px] text-[#424242] dark:text-[#E0E0E0]">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                    }}
                    className={`w-full h-[46px] px-4 rounded-xl border font-urbanist text-[14px] bg-white dark:bg-[#181A20] text-[#212121] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:border-transparent transition-all duration-200 ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E0E0] dark:border-[#35383F]'
                    }`}
                    placeholder="Enter your email address"
                  />
                  {errors.email && (
                    <span className="font-urbanist font-semibold text-[12px] text-red-500">
                      {errors.email}
                    </span>
                  )}
                </div>

                {/* Message field */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="message" className="font-urbanist font-bold text-[13px] text-[#424242] dark:text-[#E0E0E0]">
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value)
                      if (errors.message) setErrors(prev => ({ ...prev, message: undefined }))
                    }}
                    rows={4}
                    className={`w-full p-4 rounded-xl border font-urbanist text-[14px] bg-white dark:bg-[#181A20] text-[#212121] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:border-transparent transition-all duration-200 resize-none ${
                      errors.message ? 'border-red-500 focus:ring-red-500' : 'border-[#E0E0E0] dark:border-[#35383F]'
                    }`}
                    placeholder="Tell us what you need help with..."
                  />
                  {errors.message && (
                    <span className="font-urbanist font-semibold text-[12px] text-red-500">
                      {errors.message}
                    </span>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[46px] rounded-full text-[15px] font-urbanist font-semibold bg-[#6949FF] hover:bg-[#5536E6] text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed mt-2 shadow-lg shadow-[#6949FF]/10"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Message</span>
                      <Send size={14} />
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        )}
      </div>
    </InfoPageLayout>
  )
}
