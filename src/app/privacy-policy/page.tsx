'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/Footer'

export default function PrivacyPolicyPage() {
  const [isLoading, setIsLoading] = useState(true)

  // Simulate content loading
  useState(() => {
    setTimeout(() => setIsLoading(false), 300)
  })

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#6949FF]" size={48} />
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300">
      <Navbar />
      
      <main className="flex-1 w-full">
        <div className="w-full max-w-[1380px] mx-auto px-[20px] py-[60px] md:py-[100px]">
          <div className="max-w-[900px] mx-auto">
            <h1 className="font-urbanist font-bold text-[32px] md:text-[48px] leading-[120%] text-[#6949FF] mb-[24px] md:mb-[32px] text-center">
              Privacy Policy
            </h1>
            
            <div className="space-y-[32px]">
              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Introduction
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  Welcome to Puzzroo. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Information We Collect
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] mb-[12px]">
                  We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
                </p>
                <ul className="list-disc list-inside space-y-[8px] font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] ml-[16px]">
                  <li>Identity Data including first name, last name, username or similar identifier</li>
                  <li>Contact Data including email address</li>
                  <li>Technical Data including internet protocol (IP) address, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform</li>
                  <li>Usage Data including information about how you use our website and services</li>
                </ul>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  How We Use Your Information
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] mb-[12px]">
                  We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                </p>
                <ul className="list-disc list-inside space-y-[8px] font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] ml-[16px]">
                  <li>To provide and maintain our service</li>
                  <li>To notify you about changes to our service</li>
                  <li>To provide customer support</li>
                  <li>To gather analysis or valuable information so that we can improve our service</li>
                  <li>To monitor the usage of our service</li>
                  <li>To detect, prevent and address technical issues</li>
                </ul>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Local Storage
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  We use browser local storage to save your game progress, preferences, and settings. This data is stored locally on your device and is not transmitted to our servers. You can clear this data at any time through your browser settings.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Data Security
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. We limit access to your personal data to those who have a genuine business need to know it.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Your Legal Rights
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] mb-[12px]">
                  Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
                </p>
                <ul className="list-disc list-inside space-y-[8px] font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] ml-[16px]">
                  <li>Request access to your personal data</li>
                  <li>Request correction of your personal data</li>
                  <li>Request erasure of your personal data</li>
                  <li>Object to processing of your personal data</li>
                  <li>Request restriction of processing your personal data</li>
                  <li>Request transfer of your personal data</li>
                  <li>Right to withdraw consent</li>
                </ul>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Contact Us
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  If you have any questions about this privacy policy or our privacy practices, please contact us at privacy@puzzroo.com.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Changes to This Policy
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  We may update our privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last Updated" date below.
                </p>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] mt-[12px]">
                  <strong>Last Updated:</strong> June 7, 2026
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

