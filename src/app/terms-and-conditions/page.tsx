'use client'

import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/Footer'

export default function TermsAndConditionsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300">
      <Navbar />
      
      <main className="flex-1 w-full">
        <div className="w-full max-w-[1380px] mx-auto px-[20px] py-[60px] md:py-[100px]">
          <div className="max-w-[900px] mx-auto">
            <h1 className="font-urbanist font-bold text-[32px] md:text-[48px] leading-[120%] text-[#6949FF] mb-[24px] md:mb-[32px] text-center">
              Terms and Conditions
            </h1>
            
            <div className="space-y-[32px]">
              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Agreement to Terms
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  By accessing and using Puzzroo, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Use License
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] mb-[12px]">
                  Permission is granted to temporarily access and use Puzzroo for personal, non-commercial purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside space-y-[8px] font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] ml-[16px]">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to reverse engineer any software contained on Puzzroo</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                  <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                </ul>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  User Accounts
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  When you create an account with us, you guarantee that the information you provide is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Intellectual Property
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  The service and its original content, features, and functionality are and will remain the exclusive property of Puzzroo and its licensors. The service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Game Rules and Fair Play
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] mb-[12px]">
                  When using Puzzroo games, you agree to:
                </p>
                <ul className="list-disc list-inside space-y-[8px] font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD] ml-[16px]">
                  <li>Play games fairly without using automated tools or cheating mechanisms</li>
                  <li>Not exploit bugs or glitches in the game</li>
                  <li>Not attempt to manipulate scores or game statistics</li>
                  <li>Report any bugs or issues you discover</li>
                </ul>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Disclaimer
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  The materials on Puzzroo are provided on an 'as is' basis. Puzzroo makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Limitations
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  In no event shall Puzzroo or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Puzzroo, even if Puzzroo or a Puzzroo authorized representative has been notified orally or in writing of the possibility of such damage.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Modifications
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  Puzzroo may revise these terms of service at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Governing Law
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
                </p>
              </section>

              <section>
                <h2 className="font-urbanist font-bold text-[24px] md:text-[32px] leading-[120%] text-[#6949FF] mb-[16px]">
                  Contact Information
                </h2>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
                  If you have any questions about these Terms and Conditions, please contact us at support@puzzroo.com.
                </p>
              </section>

              <section>
                <p className="font-urbanist font-normal text-[16px] md:text-[18px] leading-[160%] text-[#757575] dark:text-[#BDBDBD]">
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

