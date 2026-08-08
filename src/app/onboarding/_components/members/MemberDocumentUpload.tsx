"use client"

import { useState, useRef } from 'react'
import { Upload, FileCheck2, Loader2, X } from 'lucide-react'
import { MAX_MEMBER_ID_DOCUMENTS } from '@/types/onboarding'
import type { MemberIdDocument } from '@/types/onboarding'

interface MemberDocumentUploadProps {
  memberId: string
  slotKey: string                       // base slot, e.g. "member_0_passport"
  documents: MemberIdDocument[]
  onChange: (docs: MemberIdDocument[]) => void
}

/** First unused slot key among base, base_2 … base_N given the docs already uploaded. */
function nextSlotKey(base: string, docs: MemberIdDocument[]): string {
  const used = new Set(docs.map(d => d.slotKey))
  if (!used.has(base)) return base
  for (let n = 2; n <= MAX_MEMBER_ID_DOCUMENTS; n++) {
    if (!used.has(`${base}_${n}`)) return `${base}_${n}`
  }
  return `${base}_${docs.length + 1}`
}

export function MemberDocumentUpload({
  slotKey, documents, onChange
}: MemberDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const canAddMore = documents.length < MAX_MEMBER_ID_DOCUMENTS

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !canAddMore) return

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

    const docSlotKey = nextSlotKey(slotKey, documents)

    const body = new FormData()
    body.append('file', file)
    body.append('tempSessionKey', tempSessionKey)
    body.append('slotKey', docSlotKey)

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

      onChange([
        ...documents,
        { url: data.url!, publicId: data.publicId!, fileName: data.fileName!, slotKey: docSlotKey },
      ])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const removeDocument = (docSlotKey: string) => {
    onChange(documents.filter(d => d.slotKey !== docSlotKey))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        Passport / Government ID
        <span className="text-[#34088f] ml-0.5">*</span>
        <span className="text-xs text-gray-400 font-normal ml-1.5">
          (up to {MAX_MEMBER_ID_DOCUMENTS} files)
        </span>
      </label>

      {/* Uploaded files */}
      {documents.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {documents.map(doc => (
            <div
              key={doc.slotKey}
              className="flex items-center gap-3 rounded-xl border border-[#34088f]/25 bg-[#f4f0fe]/40 px-4 py-2.5"
            >
              <FileCheck2 size={16} className="text-[#34088f] flex-shrink-0" />
              <span className="flex-1 min-w-0 text-sm text-[#34088f] font-medium truncate">
                {doc.fileName || 'Document uploaded'}
              </span>
              <button
                type="button"
                onClick={() => removeDocument(doc.slotKey)}
                className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove document"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {canAddMore && (
        <div
          onClick={() => !isUploading && inputRef.current?.click()}
          className={[
            'relative flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3',
            'cursor-pointer transition-colors duration-150',
            'border-gray-200 hover:border-[#34088f]/40 hover:bg-gray-50',
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
          ) : (
            <Upload size={18} className="text-gray-400 flex-shrink-0" />
          )}

          <span className="text-sm text-gray-400">
            {isUploading
              ? 'Uploading…'
              : documents.length > 0
                ? 'Add another file — JPG, PNG, WEBP, or PDF (max 10MB)'
                : 'Click to upload — JPG, PNG, WEBP, or PDF (max 10MB)'}
          </span>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5 border border-red-100">
          {error}
        </p>
      )}

    </div>
  )
}
