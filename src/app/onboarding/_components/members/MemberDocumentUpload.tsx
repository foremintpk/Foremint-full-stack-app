"use client"

import { useState, useRef } from 'react'
import { Upload, CheckCircle2, Loader2, X } from 'lucide-react'

interface MemberDocumentUploadProps {
  memberId: string
  slotKey: string
  existingUrl: string | null
  existingFileName: string | null
  onUploaded: (url: string, publicId: string, fileName: string) => void
}

export function MemberDocumentUpload({
  slotKey, existingUrl, existingFileName, onUploaded
}: MemberDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    const tempSessionKey =
      sessionStorage.getItem('fm_onboarding_session_key') ??
      (typeof document !== 'undefined'
        ? document.cookie
            .split('; ')
            .find(row => row.startsWith('foremint_temp_session_key='))
            ?.split('=')[1] ?? ''
        : '')

    const body = new FormData()
    body.append('file', file)
    body.append('tempSessionKey', tempSessionKey)
    body.append('slotKey', slotKey)

    try {
      const res = await fetch('/api/onboarding/upload-document', {
        method: 'POST',
        body,
      })
      const data = await res.json() as {
        url?: string; publicId?: string; fileName?: string; error?: string
      }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Upload failed. Please try again.')
        return
      }

      onUploaded(data.url!, data.publicId!, data.fileName!)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        Passport / Government ID
        <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>
      </label>

      {/* Upload zone */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        className={[
          'relative flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3',
          'cursor-pointer transition-colors duration-150',
          existingUrl
            ? 'border-[#34088f]/40 bg-[#f4f0fe]/40'
            : 'border-gray-200 hover:border-[#34088f]/40 hover:bg-gray-50',
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

        <div className="flex-1 min-w-0">
          {isUploading ? (
            <span className="text-sm text-gray-500">Uploading…</span>
          ) : existingUrl ? (
            <span className="text-sm text-[#34088f] font-medium truncate block">
              {existingFileName ?? 'Document uploaded'}
            </span>
          ) : (
            <span className="text-sm text-gray-400">
              Click to upload — JPG, PNG, WEBP, or PDF (max 10MB)
            </span>
          )}
        </div>

        {/* Clear uploaded file */}
        {existingUrl && !isUploading && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onUploaded('', '', '')
            }}
            className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5 border border-red-100">
          {error}
        </p>
      )}

    </div>
  )
}
