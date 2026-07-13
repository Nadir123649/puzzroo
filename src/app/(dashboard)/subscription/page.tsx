'use client'

import { useState, useEffect } from 'react'
import { Check, Zap } from 'lucide-react'

const features = [
  'Unlimited access to all games and difficulty levels',
  'Full archive of past Daily Challenges',
  'Ad-free experience — pure focus',
  'Advanced stats and performance tracking',
  'Early access to new games and features',
  'Compete on leaderboards without limits',
]

const pricing = {
  USD: { symbol: '$', monthly: '0.99', yearly: '9.90', lifetime: '29.90' },
  EUR: { symbol: '€', monthly: '0.99', yearly: '9.90', lifetime: '29.90' },
  PKR: { symbol: 'Rs ', monthly: '300', yearly: '3000', lifetime: '9000' }
}

export default function SubscriptionPage() {
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'PKR'>(() => {
    if (typeof window === 'undefined') return 'USD'
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const tzMap: Record<string, 'USD' | 'EUR' | 'PKR'> = {
        'Asia/Karachi': 'PKR',
        'Europe/Berlin': 'EUR',
        'Europe/Paris': 'EUR',
        'Europe/Rome': 'EUR',
        'Europe/Madrid': 'EUR',
        'Europe/Amsterdam': 'EUR',
        'Europe/Brussels': 'EUR',
        'Europe/Vienna': 'EUR',
        'Europe/Lisbon': 'EUR',
        'Europe/Helsinki': 'EUR',
        'Europe/Dublin': 'EUR',
        'Europe/Athens': 'EUR',
        'Europe/Tallinn': 'EUR',
        'Europe/Vilnius': 'EUR',
        'Europe/Bratislava': 'EUR',
        'Europe/Ljubljana': 'EUR',
      }
      if (tzMap[tz]) return tzMap[tz]
      if (tz.startsWith('Europe/')) return 'EUR'
    } catch {}
    return 'USD'
  })

  useEffect(() => {
    const detectCurrency = async () => {
      let detectedCountry = ''
      
      // Try IP-based detection via XMLHttpRequest (bypasses Next.js dev-overlay fetch interceptor)
      try {
        const data = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('GET', 'https://ipapi.co/json/', true)
          xhr.timeout = 4000
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText))
              } catch (e) {
                reject(e)
              }
            } else {
              reject(new Error(`HTTP ${xhr.status}`))
            }
          }
          xhr.onerror = () => reject(new Error('Network error'))
          xhr.ontimeout = () => reject(new Error('Timeout'))
          xhr.send()
        })
        
        if (data && data.country_code) {
          detectedCountry = data.country_code
        }
      } catch (err) {
        console.warn('IP-based currency detection failed, falling back to timezone:', err)
      }

      if (detectedCountry) {
        const euCountries = ['FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'IE', 'GR', 'LU', 'MT', 'CY', 'EE', 'LV', 'LT', 'SK', 'SI']
        if (detectedCountry === 'PK') {
          setCurrency('PKR')
        } else if (euCountries.includes(detectedCountry)) {
          setCurrency('EUR')
        } else {
          setCurrency('USD')
        }
      }
    }

    detectCurrency()
  }, [])

  const currentPricing = pricing[currency]

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center mb-6">
        <h1 className="font-urbanist font-bold text-[26px] md:text-[32px] text-[#212121] dark:text-white mb-2">
          Unlock Your Full Puzzle Experience
        </h1>
        <p className="font-urbanist text-[14px] md:text-[15px] text-[#757575] dark:text-[#BDBDBD] max-w-[500px] mx-auto leading-relaxed">
          Access all games, unlimited challenges, and a distraction-free experience.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Monthly Plan */}
        <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-5 hover:border-[#6949FF] transition-all duration-200 flex flex-col justify-between">
          <div>
            <h3 className="font-urbanist font-bold text-[18px] text-[#212121] dark:text-white mb-1">
              Monthly
            </h3>
            <div className="mb-4">
              <span className="font-urbanist font-bold text-[32px] md:text-[36px] text-[#6949FF]" suppressHydrationWarning>
                {currentPricing.symbol}{currentPricing.monthly}
              </span>
              <span className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD] ml-1">
                /month
              </span>
            </div>
          </div>
          <div>
            <button className="w-full h-[40px] bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[13px] transition-all duration-200 active:scale-95 mb-2">
              Choose Monthly
            </button>
            <p className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD] text-center">
              Billed monthly
            </p>
          </div>
        </div>

        {/* Yearly Plan - Best Value */}
        <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[2px] border-[#6949FF] p-4 md:p-5 relative shadow-md shadow-purple-500/10 flex flex-col justify-between">
          {/* Best Value Badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#6949FF] rounded-full">
            <span className="font-urbanist font-bold text-[10px] text-white uppercase tracking-wider">
              Best Value
            </span>
          </div>

          <div className="mt-2">
            <h3 className="font-urbanist font-bold text-[18px] text-[#212121] dark:text-white mb-1">
              Yearly
            </h3>
            <div className="mb-2">
              <span className="font-urbanist font-bold text-[32px] md:text-[36px] text-[#6949FF]" suppressHydrationWarning>
                {currentPricing.symbol}{currentPricing.yearly}
              </span>
              <span className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD] ml-1">
                /year
              </span>
            </div>
            <div className="inline-block px-2.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <span className="font-urbanist font-bold text-[11px] text-green-600 dark:text-green-400">
                Save 17%
              </span>
            </div>
          </div>
          <div>
            <button className="w-full h-[40px] bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[13px] transition-all duration-200 active:scale-95 mb-2">
              Choose Yearly
            </button>
            <p className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD] text-center">
              Billed annually
            </p>
          </div>
        </div>

        {/* Lifetime Plan */}
        <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-5 hover:border-[#6949FF] transition-all duration-200 flex flex-col justify-between">
          <div>
            <h3 className="font-urbanist font-bold text-[18px] text-[#212121] dark:text-white mb-1">
              Lifetime
            </h3>
            <div className="mb-4">
              <span className="font-urbanist font-bold text-[32px] md:text-[36px] text-[#6949FF]" suppressHydrationWarning>
                {currentPricing.symbol}{currentPricing.lifetime}
              </span>
              <span className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD] ml-1">
                /one-time
              </span>
            </div>
          </div>
          <div>
            <button className="w-full h-[40px] bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[13px] transition-all duration-200 active:scale-95 mb-2">
              Get Lifetime Access
            </button>
            <p className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD] text-center">
              Pay once, play forever
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-5 md:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <Zap size={18} className="text-[#6949FF]" />
          </div>
          <h2 className="font-urbanist font-bold text-[20px] text-[#212121] dark:text-white">
            Everything Included
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-3.5">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <div className="flex-shrink-0 w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mt-0.5">
                <Check size={12} className="text-green-600 dark:text-green-400" strokeWidth={3} />
              </div>
              <span className="font-urbanist text-[13.5px] text-[#424242] dark:text-[#E0E0E0] leading-normal">
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-[#E0E0E0] dark:border-[#35383F]">
          <p className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD] text-center">
            Secure payment powered by Stripe. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  )
}
