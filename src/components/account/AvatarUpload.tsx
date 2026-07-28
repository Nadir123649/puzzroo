'use client'

import { useState, useRef } from 'react'
import { Camera, X, Upload, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api/client'
import { updateUser, getCurrentUser } from '@/lib/auth/frontend-auth'
import { notify } from '@/lib/toast'

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface AvatarUploadProps {
  currentAvatar?: string | null
  userName: string
  onAvatarChanged: (url: string) => void
}

export function AvatarUpload({ currentAvatar, userName, onAvatarChanged }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported file format. Use JPG, PNG, or WebP.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum 5MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !preview) return

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', file)

      const uploadRes = await api('/api/v1/uploads/image', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.success) {
        throw new Error((uploadRes.payload as any)?.error?.message || 'Upload failed')
      }

      const { imageUrl } = (uploadRes.payload as any) as { imageUrl: string }

      const profileRes = await updateUser({ avatar: imageUrl })

      if (!profileRes) {
        throw new Error('Failed to save avatar')
      }

      onAvatarChanged(imageUrl)
      setPreview(null)
      notify.success('Avatar updated successfully')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.')
      notify.error(err.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setPreview(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const initials = userName
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-[#6949FF] flex items-center justify-center text-white text-3xl font-bold font-urbanist overflow-hidden ring-4 ring-purple-100 dark:ring-[#6949FF]/20">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : currentAvatar ? (
            <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-70"
          title="Change avatar"
        >
          <Camera size={16} strokeWidth={2.5} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="flex flex-col items-center sm:items-start gap-3 sm:pt-2">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <p className="font-urbanist text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {preview && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex items-center gap-2 px-5 py-2 bg-[#6949FF] hover:bg-[#5536E6] text-white rounded-full font-urbanist font-semibold text-[13px] transition-all duration-200 active:scale-95 disabled:opacity-70"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Save Avatar
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#2A2D35] text-[#424242] dark:text-[#E0E0E0] rounded-full font-urbanist font-semibold text-[13px] transition-all duration-200 active:scale-95 disabled:opacity-70"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        )}

        <p className="font-urbanist text-[12px] text-[#757575] dark:text-[#9E9E9E]">
          JPG, PNG or WebP. Max 5MB.
        </p>
      </div>
    </div>
  )
}
