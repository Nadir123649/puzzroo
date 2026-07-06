'use client'

import { useState, useEffect } from 'react'
import { AccountLayout } from '@/components/account/AccountLayout'
import { Check, Zap, Loader2 } from 'lucide-react'

const features = [
  'Unlimited access to all games and difficulty levels',
  'Full archive of past Daily Challenges',
  'Ad-free experience — pure focus',
  'Advanced stats and performance tracking',
  'Early access to new games and features',
  'Compete on leaderboards without limits',
]

export default function SubscriptionPage() {
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'PKR'>('EUR') // Default to EUR as it was the original
  const [isCurrencyLoading, setIsCurrencyLoading] = useState(true)

  useEffect(() => {
    const detectCurrency = async () => {
      let detectedCountry = ''
      
      // 1. Try IP-based detection via XMLHttpRequest (bypasses Next.js dev-overlay fetch interceptor)
      try {
        const data = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('GET', 'https://ipapi.co/json/', true)
          xhr.timeout = 4000 // 4 seconds timeout
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

      // 2. Fallback to timezone-based detection if IP lookup failed
      if (!detectedCountry) {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
          const tzMap: Record<string, string> = {
            'Asia/Karachi': 'PK',
            'Europe/Berlin': 'DE',
            'Europe/Riga': 'LV',
            'Europe/Paris': 'FR',
            'Europe/Rome': 'IT',
            'Europe/Madrid': 'ES',
            'Europe/Amsterdam': 'NL',
            'Europe/Brussels': 'BE',
            'Europe/Vienna': 'AT',
            'Europe/Lisbon': 'PT',
            'Europe/Helsinki': 'FI',
            'Europe/Dublin': 'IE',
            'Europe/Athens': 'GR',
            'Europe/Tallinn': 'EE',
            'Europe/Vilnius': 'LT',
            'Europe/Bratislava': 'SK',
            'Europe/Ljubljana': 'SI',
          }
          
          if (tzMap[tz]) {
            detectedCountry = tzMap[tz]
          } else if (tz.startsWith('Europe/')) {
            detectedCountry = 'DE' // default to EU country if in Europe timezone
          }
        } catch (tzErr) {
          console.error('Timezone detection failed:', tzErr)
        }
      }

      // 3. Map country code to currency
      const euCountries = ['FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'IE', 'GR', 'LU', 'MT', 'CY', 'EE', 'LV', 'LT', 'SK', 'SI']
      
      if (detectedCountry === 'PK') {
        setCurrency('PKR')
      } else if (euCountries.includes(detectedCountry)) {
        setCurrency('EUR')
      } else {
        setCurrency('USD')
      }
      setIsCurrencyLoading(false)
    }

    detectCurrency()
  }, [])

  const pricing = {
    USD: { symbol: '$', monthly: '0.99', yearly: '9.90', lifetime: '29.90' },
    EUR: { symbol: '€', monthly: '0.99', yearly: '9.90', lifetime: '29.90' },
    PKR: { symbol: 'Rs ', monthly: '300', yearly: '3000', lifetime: '9000' }
  }

  const currentPricing = pricing[currency]

  return (
    <AccountLayout>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="font-urbanist font-bold text-[36px] md:text-[48px] text-[#212121] dark:text-white mb-4">
                Unlock Your Full Puzzle Experience
              </h1>
              <p className="font-urbanist text-[16px] md:text-[18px] text-[#757575] dark:text-[#BDBDBD] max-w-[600px] mx-auto">
                Access all games, unlimited challenges, and a distraction-free experience.
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* Monthly Plan */}
              <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-6 hover:border-[#6949FF] transition-all duration-200">
                <h3 className="font-urbanist font-bold text-[20px] text-[#212121] dark:text-white mb-2">
                  Monthly
                </h3>
                <div className="mb-6">
                  <span className="font-urbanist font-bold text-[40px] text-[#6949FF]">
                    {isCurrencyLoading ? <Loader2 className="animate-spin inline-block w-8 h-8" /> : `${currentPricing.symbol}${currentPricing.monthly}`}
                  </span>
                  <span className="font-urbanist text-[16px] text-[#757575] dark:text-[#BDBDBD] ml-1">
                    /month
                  </span>
                </div>
                <button className="w-full h-[42px] bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[14px] transition-all duration-200 active:scale-95 mb-4">
                  Choose Monthly
                </button>
                <p className="font-urbanist text-[13px] text-[#757575] dark:text-[#BDBDBD] text-center">
                  Billed monthly
                </p>
              </div>

              {/* Yearly Plan - Best Value */}
              <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[2px] border-[#6949FF] p-6 relative transform md:scale-105 shadow-lg shadow-purple-500/20">
                {/* Best Value Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#6949FF] rounded-full">
                  <span className="font-urbanist font-bold text-[12px] text-white">
                    Best Value
                  </span>
                </div>

                <h3 className="font-urbanist font-bold text-[20px] text-[#212121] dark:text-white mb-2 mt-2">
                  Yearly
                </h3>
                <div className="mb-2">
                  <span className="font-urbanist font-bold text-[40px] text-[#6949FF]">
                    {isCurrencyLoading ? <Loader2 className="animate-spin inline-block w-8 h-8" /> : `${currentPricing.symbol}${currentPricing.yearly}`}
                  </span>
                  <span className="font-urbanist text-[16px] text-[#757575] dark:text-[#BDBDBD] ml-1">
                    /year
                  </span>
                </div>
                <div className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                  <span className="font-urbanist font-bold text-[13px] text-green-600 dark:text-green-400">
                    Save 17%
                  </span>
                </div>
                <button className="w-full h-[42px] bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[14px] transition-all duration-200 active:scale-95 mb-4">
                  Choose Yearly
                </button>
                <p className="font-urbanist text-[13px] text-[#757575] dark:text-[#BDBDBD] text-center">
                  Billed annually
                </p>
              </div>

              {/* Lifetime Plan */}
              <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-6 hover:border-[#6949FF] transition-all duration-200">
                <h3 className="font-urbanist font-bold text-[20px] text-[#212121] dark:text-white mb-2">
                  Lifetime
                </h3>
                <div className="mb-6">
                  <span className="font-urbanist font-bold text-[40px] text-[#6949FF]">
                    {isCurrencyLoading ? <Loader2 className="animate-spin inline-block w-8 h-8" /> : `${currentPricing.symbol}${currentPricing.lifetime}`}
                  </span>
                  <span className="font-urbanist text-[16px] text-[#757575] dark:text-[#BDBDBD] ml-1">
                    /one-time
                  </span>
                </div>
                <button className="w-full h-[42px] bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[14px] transition-all duration-200 active:scale-95 mb-4">
                  Get Lifetime Access
                </button>
                <p className="font-urbanist text-[13px] text-[#757575] dark:text-[#BDBDBD] text-center">
                  Pay once, play forever
                </p>
              </div>
            </div>

            {/* Features Section */}
            <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Zap size={20} className="text-[#6949FF]" />
                </div>
                <h2 className="font-urbanist font-bold text-[24px] text-[#212121] dark:text-white">
                  Everything Included
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mt-0.5">
                      <Check size={14} className="text-green-600 dark:text-green-400" strokeWidth={3} />
                    </div>
                    <span className="font-urbanist text-[15px] text-[#424242] dark:text-[#E0E0E0]">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer Note */}
              <div className="mt-8 pt-6 border-t border-[#E0E0E0] dark:border-[#35383F]">
                <p className="font-urbanist text-[13px] text-[#757575] dark:text-[#BDBDBD] text-center">
                  Secure payment powered by Stripe. Cancel anytime.
                </p>
              </div>
            </div>
    </AccountLayout>
  )
}
