"use client"

import { useState, useRef } from 'react'
import { Upload, CheckCircle2, Loader2, X } from 'lucide-react'

interface PaymentReceiptUploadProps {
  existingUrl: string | null
  existingFileName: string | null
  onUploaded: (url: string, publicId: string, fileName: string) => void
}

export function PaymentReceiptUpload({
  existingUrl,
  existingFileName,
  onUploaded,
}: PaymentReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum 10MB.')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: JPG, PNG, WEBP, PDF.')
      return
    }

    setIsUploading(true)
    setError(null)

    const body = new FormData()
    body.append('file', file)

    try {
      const res = await fetch('/api/onboarding/upload-receipt', { method: 'POST', body })
      const data = (await res.json()) as {
        url?: string
        publicId?: string
        error?: string
      }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Upload failed.')
        return
      }
      onUploaded(data.url!, data.publicId!, file.name)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-gray-700">
        Upload Payment Screenshot
        <span className="text-xs text-gray-400 font-normal ml-1">
          (optional but recommended)
        </span>
      </p>

      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        className={[
          'flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-colors',
          existingUrl
            ? 'border-[#34088f]/40 bg-[#f4f0fe]/40'
            : 'border-gray-200 hover:border-[#34088f]/40',
          isUploading ? 'pointer-events-none opacity-70' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {isUploading ? (
          <Loader2 size={18} className="text-[#34088f] animate-spin flex-shrink-0" />
        ) : existingUrl ? (
          <CheckCircle2 size={18} className="text-[#34088f] flex-shrink-0" />
        ) : (
          <Upload size={18} className="text-gray-400 flex-shrink-0" />
        )}

        <span
          className={[
            'text-sm flex-1 truncate',
            existingUrl ? 'text-[#34088f] font-medium' : 'text-gray-400',
          ].join(' ')}
        >
          {isUploading
            ? 'Uploading…'
            : existingUrl
              ? (existingFileName ?? 'Receipt uploaded')
              : 'Click to upload payment screenshot or PDF'}
        </span>

        {existingUrl && !isUploading && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onUploaded('', '', '')
            }}
            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-1.5 border border-red-100">
          {error}
        </p>
      )}
    </div>
  )
}
