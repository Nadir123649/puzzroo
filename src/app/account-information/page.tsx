'use client'

import { useState } from 'react'
import { AccountLayout } from '@/components/account/AccountLayout'
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal'
import { getCurrentUser, getLastLoginInfo } from '@/lib/auth/frontend-auth'
import { Check, Activity, BarChart3, Monitor, MapPin } from 'lucide-react'

export default function AccountInformationPage() {
  const user = getCurrentUser()
  const loginInfo = getLastLoginInfo()
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  return (
    <AccountLayout>
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-urbanist font-bold text-[32px] md:text-[40px] text-[#212121] dark:text-white mb-2">
                {user?.name || 'User'}
              </h1>
              <p className="font-urbanist text-[16px] text-[#757575] dark:text-[#BDBDBD]">
                Account Information
              </p>
            </div>

            {/* Account Details Card */}
            <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-6 md:p-8 mb-6">
              <h2 className="font-urbanist font-bold text-[24px] text-[#212121] dark:text-white mb-6">
                Account Details
              </h2>

              <div className="space-y-5">
                {/* Name */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-[#E0E0E0] dark:border-[#35383F]">
                  <span className="font-urbanist font-semibold text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
                    Name
                  </span>
                  <span className="font-urbanist font-semibold text-[15px] text-[#212121] dark:text-white">
                    {user?.name || 'N/A'}
                  </span>
                </div>

                {/* Joined Since */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-[#E0E0E0] dark:border-[#35383F]">
                  <span className="font-urbanist font-semibold text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
                    Joined Since
                  </span>
                  <span className="font-urbanist font-semibold text-[15px] text-[#212121] dark:text-white">
                    {user?.joinedDate || 'N/A'}
                  </span>
                </div>

                {/* Account ID */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-[#E0E0E0] dark:border-[#35383F]">
                  <span className="font-urbanist font-semibold text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
                    Account ID
                  </span>
                  <span className="font-urbanist font-mono text-[13px] text-[#212121] dark:text-white break-all">
                    {user?.id || 'N/A'}
                  </span>
                </div>

                {/* Account Status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-[#E0E0E0] dark:border-[#35383F]">
                  <span className="font-urbanist font-semibold text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
                    Account Status
                  </span>
                  <span className="font-urbanist font-semibold text-[15px] text-green-600 dark:text-green-400 capitalize">
                    {user?.accountStatus || 'Active'}
                  </span>
                </div>

                {/* Username */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-[#E0E0E0] dark:border-[#35383F]">
                  <span className="font-urbanist font-semibold text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
                    Username
                  </span>
                  <span className="font-urbanist font-semibold text-[15px] text-[#212121] dark:text-white">
                    {user?.username || 'N/A'}
                  </span>
                </div>

                {/* Email Address */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-3 border-b border-[#E0E0E0] dark:border-[#35383F]">
                  <span className="font-urbanist font-semibold text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
                    Email Address
                  </span>
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="font-urbanist font-semibold text-[15px] text-[#212121] dark:text-white break-all">
                      {user?.email || 'N/A'}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <Check size={14} className="text-green-600 dark:text-green-400" strokeWidth={3} />
                      <span className="font-urbanist text-[12px] text-green-600 dark:text-green-400 font-semibold">
                        Verified
                      </span>
                    </div>
                    <span className="font-urbanist text-[12px] text-[#757575] dark:text-[#BDBDBD] mt-1">
                      Email address cannot be changed
                    </span>
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-[#E0E0E0] dark:border-[#35383F]">
                  <span className="font-urbanist font-semibold text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-2 sm:mb-0">
                    Password
                  </span>
                  <button 
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-2 bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[14px] transition-all duration-200 active:scale-95"
                  >
                    Change
                  </button>
                </div>

                {/* Subscription Plan */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3">
                  <span className="font-urbanist font-semibold text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-1 sm:mb-0">
                    Subscription Plan
                  </span>
                  <span className="font-urbanist font-semibold text-[15px] text-[#212121] dark:text-white capitalize">
                    {user?.subscriptionPlan || 'Free'}
                  </span>
                </div>

                {/* Connected Accounts */}
                <div className="pt-4">
                  <h3 className="font-urbanist font-bold text-[16px] text-[#212121] dark:text-white mb-3">
                    Connected Accounts
                  </h3>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#181A20] rounded-xl">
                    <div className="w-10 h-10 bg-white dark:bg-[#1F222A] rounded-lg flex items-center justify-center">
                      <span className="text-[20px]">G</span>
                    </div>
                    <span className="font-urbanist font-semibold text-[15px] text-[#212121] dark:text-white">
                      Google
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Statistics Card */}
            <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-6 md:p-8 mb-6">
              <h2 className="font-urbanist font-bold text-[24px] text-[#212121] dark:text-white mb-6">
                Game Statistics
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={18} className="text-[#6949FF]" />
                    <span className="font-urbanist text-[12px] font-semibold text-[#757575] dark:text-[#BDBDBD]">
                      Games Played
                    </span>
                  </div>
                  <p className="font-urbanist font-bold text-[28px] text-[#212121] dark:text-white">
                    1
                  </p>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={18} className="text-green-600" />
                    <span className="font-urbanist text-[12px] font-semibold text-[#757575] dark:text-[#BDBDBD]">
                      Completed
                    </span>
                  </div>
                  <p className="font-urbanist font-bold text-[28px] text-[#212121] dark:text-white">
                    0
                  </p>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={18} className="text-orange-600" />
                    <span className="font-urbanist text-[12px] font-semibold text-[#757575] dark:text-[#BDBDBD]">
                      Current Streak
                    </span>
                  </div>
                  <p className="font-urbanist font-bold text-[28px] text-[#212121] dark:text-white">
                    0 days
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={18} className="text-blue-600" />
                    <span className="font-urbanist text-[12px] font-semibold text-[#757575] dark:text-[#BDBDBD]">
                      Completion Rate
                    </span>
                  </div>
                  <p className="font-urbanist font-bold text-[28px] text-[#212121] dark:text-white">
                    0%
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-6 md:p-8">
              <h2 className="font-urbanist font-bold text-[24px] text-[#212121] dark:text-white mb-6">
                Recent Activity
              </h2>

              {loginInfo && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Last Login Card */}
                  <div className="p-5 bg-purple-50/50 dark:bg-purple-500/5 rounded-xl border border-purple-100/50 dark:border-purple-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={18} className="text-purple-600" strokeWidth={2} />
                      <span className="font-urbanist text-[12px] font-semibold text-[#757575] dark:text-[#9E9E9E]">
                        Last Login
                      </span>
                    </div>
                    <p className="font-urbanist font-bold text-[20px] text-[#181A20] dark:text-white">
                      {loginInfo.lastLogin}
                    </p>
                  </div>

                  {/* Device Card */}
                  <div className="p-5 bg-purple-50/50 dark:bg-purple-500/5 rounded-xl border border-purple-100/50 dark:border-purple-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor size={18} className="text-purple-600" strokeWidth={2} />
                      <span className="font-urbanist text-[12px] font-semibold text-[#757575] dark:text-[#9E9E9E]">
                        Device
                      </span>
                    </div>
                    <p className="font-urbanist font-bold text-[20px] text-[#181A20] dark:text-white">
                      {loginInfo.device}
                    </p>
                  </div>

                  {/* Location Card */}
                  <div className="p-5 bg-purple-50/50 dark:bg-purple-500/5 rounded-xl border border-purple-100/50 dark:border-purple-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={18} className="text-purple-600" strokeWidth={2} />
                      <span className="font-urbanist text-[12px] font-semibold text-[#757575] dark:text-[#9E9E9E]">
                        Location
                      </span>
                    </div>
                    <p className="font-urbanist font-bold text-[20px] text-[#181A20] dark:text-white">
                      {loginInfo.location}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <ChangePasswordModal 
              isOpen={isPasswordModalOpen} 
              onClose={() => setIsPasswordModalOpen(false)} 
            />
    </AccountLayout>
  )
}
