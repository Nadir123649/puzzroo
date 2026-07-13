'use client'

import { getCurrentUser } from '@/lib/auth/frontend-auth'
import { Receipt, Calendar, CreditCard } from 'lucide-react'

export default function BillingHistoryPage() {
  const user = getCurrentUser()

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-urbanist font-bold text-[26px] md:text-[32px] text-[#212121] dark:text-white mb-1">
          Billing History
        </h1>
        <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD]">
          Manage your invoices, view past transactions, and download your receipts
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Current Plan */}
        <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <CreditCard size={18} className="text-[#6949FF]" strokeWidth={2} />
            </div>
            <h3 className="font-urbanist font-bold text-[14px] text-[#757575] dark:text-[#BDBDBD]">
              Current Plan
            </h3>
          </div>
          <p className="font-urbanist font-bold text-[22px] md:text-[24px] text-[#212121] dark:text-white capitalize">
            {user?.subscriptionPlan || 'Free'}
          </p>
        </div>

        {/* Next Billing */}
        <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Calendar size={18} className="text-blue-600" strokeWidth={2} />
            </div>
            <h3 className="font-urbanist font-bold text-[14px] text-[#757575] dark:text-[#BDBDBD]">
              Next Billing
            </h3>
          </div>
          <p className="font-urbanist font-bold text-[22px] md:text-[24px] text-[#212121] dark:text-white">
            —
          </p>
        </div>

        {/* Total Invoices */}
        <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-4 md:p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Receipt size={18} className="text-green-600" strokeWidth={2} />
            </div>
            <h3 className="font-urbanist font-bold text-[14px] text-[#757575] dark:text-[#BDBDBD]">
              Total Invoices
            </h3>
          </div>
          <p className="font-urbanist font-bold text-[22px] md:text-[24px] text-[#212121] dark:text-white">
            0
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-5 md:p-6">
        <h2 className="font-urbanist font-bold text-[18px] md:text-[20px] text-[#212121] dark:text-white mb-4">
          Transaction Records
        </h2>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-16 h-16 bg-gray-100 dark:bg-[#181A20] rounded-full flex items-center justify-center mb-4">
            <Receipt size={28} className="text-[#757575] dark:text-[#BDBDBD]" strokeWidth={1.5} />
          </div>
          <h3 className="font-urbanist font-bold text-[16px] md:text-[18px] text-[#212121] dark:text-white mb-1">
            No History Found
          </h3>
          <p className="font-urbanist text-[13px] text-[#757575] dark:text-[#BDBDBD] text-center max-w-[360px]">
            Your transaction records will appear here once you subscribe or make a purchase.
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
        <p className="font-urbanist text-[13px] text-purple-900 dark:text-purple-300">
          <strong>Need help?</strong> If you have questions about your billing or need to update your payment method, 
          please contact our support team.
        </p>
      </div>
    </div>
  )
}
