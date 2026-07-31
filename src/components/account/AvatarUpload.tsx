'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, ImagePlus, Pencil, Trash2, X, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api/client'
import { updateUser } from '@/lib/auth/frontend-auth'
import { notify } from '@/lib/toast'

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface AvatarUploadProps {
  currentAvatar?: string | null
  userName: string
  onAvatarChanged: (url: string | null) => void
}

export function AvatarUpload({ currentAvatar, userName, onAvatarChanged }: AvatarUploadProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const quickMenuRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!isViewerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isViewerOpen])

  useEffect(() => {
    if (!showQuickMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowQuickMenu(false)
    }
    const onPointerDown = (e: PointerEvent) => {
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node)) {
        setShowQuickMenu(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [showQuickMenu])

  useEffect(() => {
    if (!showCamera) return
    let cancelled = false
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        if (cancelled) return
        // No permission/camera — fall back to the native capture flow.
        setShowCamera(false)
        cameraInputRef.current?.click()
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [showCamera])

  const openCamera = () => {
    setError('')
    setShowQuickMenu(false)
    setShowCamera(true)
    setIsViewerOpen(true)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const captured = new File([blob], 'camera-photo.png', { type: 'image/png' })
        setShowCamera(false)
        validateAndPreview(captured)
      },
      'image/png'
    )
  }

  const validateAndPreview = (selected: File) => {
    setError('')

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Unsupported file format. Use JPG, PNG, or WebP.')
      return
    }

    if (selected.size > MAX_SIZE) {
      setError('File too large. Maximum 5MB.')
      return
    }

    setIsViewerOpen(true)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(selected)
    // No manual "Save Avatar" step — the photo updates the header instantly.
    handleUpload(selected)
  }

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    validateAndPreview(selected)
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    validateAndPreview(selected)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleUpload = async (selected: File) => {
    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('image', selected)

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
      closeViewer()
      notify.success('Avatar updated successfully')
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.')
      notify.error(err.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const res = await updateUser({ avatar: null })
      if (!res) {
        throw new Error('Failed to remove photo')
      }
      onAvatarChanged(null)
      closeViewer()
      notify.success('Avatar removed')
    } catch (err: any) {
      setError(err.message || 'Failed to remove photo. Please try again.')
      notify.error(err.message || 'Failed to remove photo')
    } finally {
      setIsDeleting(false)
    }
  }

  const closeViewer = () => {
    setIsViewerOpen(false)
    setShowCamera(false)
    setPreview(null)
    setError('')
    setConfirmDelete(false)
  }

  const initials = userName
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  const avatarImage = preview ? preview : currentAvatar

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" ref={quickMenuRef}>
        <button
          type="button"
          onClick={() => setIsViewerOpen(true)}
          disabled={isUploading}
          className="block cursor-pointer select-none"
          title="View profile photo"
          aria-label="View profile photo"
        >
          <div className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-[#6949FF] flex items-center justify-center text-white text-5xl font-bold font-urbanist overflow-hidden ring-4 ring-purple-100 dark:ring-[#6949FF]/20 transition-transform duration-200 hover:scale-[1.03] active:scale-95">
            {avatarImage ? (
              <img src={avatarImage} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
        </button>

        {/* Pencil quick-edit */}
        <button
          type="button"
          onClick={() => setShowQuickMenu(prev => !prev)}
          className="absolute -bottom-1 -right-1 w-9 h-9 bg-white dark:bg-[#1F222A] border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] text-[#6949FF] hover:bg-[#6949FF] hover:text-white rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-90"
          title="Edit profile photo"
          aria-label="Edit profile photo"
        >
          <Pencil size={15} strokeWidth={2.5} />
        </button>

        {/* Quick edit popover: gallery or camera only */}
        {showQuickMenu && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[min(16rem,calc(100vw-1.5rem))] z-50">
            <div className="bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] shadow-2xl p-2 animate-slide-up">
            <button
              type="button"
              onClick={() => {
                setShowQuickMenu(false)
                galleryInputRef.current?.click()
              }}
              className="flex items-center gap-3 w-full px-3 py-3 hover:bg-gray-50 dark:hover:bg-[#2A2D35] rounded-xl transition-colors duration-150"
            >
              <span className="w-9 h-9 rounded-full bg-[#6949FF] flex items-center justify-center shrink-0">
                <ImagePlus size={16} strokeWidth={2.5} className="text-white" />
              </span>
              <span className="flex flex-col items-start">
                <span className="font-urbanist font-bold text-[14px] text-[#212121] dark:text-white">Choose from Gallery</span>
                <span className="font-urbanist text-[12px] text-[#757575] dark:text-[#9E9E9E]">Pick an image from your device</span>
              </span>
            </button>

            <button
              type="button"
              onClick={openCamera}
              className="flex items-center gap-3 w-full px-3 py-3 hover:bg-gray-50 dark:hover:bg-[#2A2D35] rounded-xl transition-colors duration-150"
            >
              <span className="w-9 h-9 rounded-full bg-[#6949FF] flex items-center justify-center shrink-0">
                <Camera size={16} strokeWidth={2.5} className="text-white" />
              </span>
              <span className="flex flex-col items-start">
                <span className="font-urbanist font-bold text-[14px] text-[#212121] dark:text-white">Take Photo</span>
                <span className="font-urbanist text-[12px] text-[#757575] dark:text-[#9E9E9E]">Use your device camera</span>
              </span>
            </button>
            </div>
          </div>
        )}

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleGallerySelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleCameraCapture}
          className="hidden"
        />
      </div>

      <h2 className="font-urbanist font-extrabold text-[20px] md:text-[24px] text-[#212121] dark:text-white">
        {userName || 'User'}
      </h2>

      {/* Profile Photo Viewer */}
      {isViewerOpen && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 backdrop-blur-md bg-white/40 dark:bg-black/40 animate-fade-in"
          onClick={closeViewer}
        >
          <div
            className="flex flex-col items-center gap-8 w-full max-w-sm animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {!showCamera && (
              <div className="relative animate-fade-in" style={{ animationDelay: '80ms' }}>
                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden ring-4 ring-gray-200 dark:ring-white/25 shadow-2xl bg-[#6949FF] flex items-center justify-center text-white text-6xl font-bold font-urbanist">
                  {avatarImage ? (
                    <img src={avatarImage} alt="Profile photo" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {isUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-[2px] animate-fade-in">
                    <div className="w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={closeViewer}
                  disabled={isUploading}
                  className="absolute -top-2 -right-2 w-9 h-9 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/25 text-gray-500 dark:text-white rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-90 hover:rotate-90 disabled:opacity-50"
                  aria-label="Close photo viewer"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-xl w-full animate-fade-in">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                <p className="font-urbanist text-[13px] font-semibold text-red-600 dark:text-red-300">{error}</p>
              </div>
            )}

            {showCamera ? (
              <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-gray-200 dark:border-white/10">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white ring-4 ring-gray-200 dark:ring-white/30 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse-subtle"
                  aria-label="Capture photo"
                >
                  <span className="w-12 h-12 rounded-full bg-[#6949FF]" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCamera(false)}
                  className="flex items-center justify-center gap-2 w-full h-[48px] rounded-full font-urbanist font-semibold text-[15px] bg-white text-[#212121] dark:bg-[#2A2D35] dark:text-white border border-[#E0E0E0] dark:border-[#35383F] hover:bg-gray-50 dark:hover:bg-[#35383F] transition-all duration-200 active:scale-95"
                >
                  <X size={18} strokeWidth={2.5} />
                  Cancel Camera
                </button>
              </div>
            ) : isUploading ? (
              <div className="flex items-center justify-center gap-2 w-full py-4 animate-fade-in">
                <div className="w-5 h-5 border-2 border-[#6949FF] border-t-transparent rounded-full animate-spin" />
                <span className="font-urbanist font-semibold text-[15px] text-[#212121] dark:text-white">
                  Uploading photo...
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex items-center justify-center gap-2 w-full h-[48px] rounded-full font-urbanist font-semibold text-[15px] bg-[#6949FF] hover:bg-[#5536E6] text-white transition-all duration-200 active:scale-95 animate-fade-in"
                  style={{ animationDelay: '120ms' }}
                >
                  <Camera size={18} strokeWidth={2.5} />
                  Take Photo
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full h-[48px] rounded-full font-urbanist font-semibold text-[15px] bg-white text-[#212121] dark:bg-[#2A2D35] dark:text-white border-[1.5px] border-[#6949FF]/50 hover:border-[#6949FF] hover:bg-[#6949FF]/5 dark:border-[#6949FF]/50 dark:hover:border-[#6949FF] dark:hover:bg-[#6949FF]/10 transition-all duration-200 active:scale-95 animate-fade-in"
                  style={{ animationDelay: '200ms' }}
                >
                  <ImagePlus size={18} strokeWidth={2.5} className="text-[#6949FF]" />
                  Upload Photo
                </button>

                {currentAvatar && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isDeleting}
                    className={`flex items-center justify-center gap-2 w-full h-[48px] rounded-full font-urbanist font-semibold text-[15px] border-[1.5px] transition-all duration-200 active:scale-95 disabled:opacity-70 animate-fade-in ${
                      confirmDelete
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-white text-red-500 dark:bg-[#2A2D35] border-[#6949FF]/50 hover:border-[#6949FF] hover:bg-[#6949FF]/5 dark:border-[#6949FF]/50 dark:hover:border-[#6949FF] dark:hover:bg-[#6949FF]/10'
                    }`}
                    style={{ animationDelay: '280ms' }}
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={18} strokeWidth={2.5} />
                    )}
                    {confirmDelete ? 'Tap to Confirm Removal' : isDeleting ? 'Removing...' : 'Remove Current Photo'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
