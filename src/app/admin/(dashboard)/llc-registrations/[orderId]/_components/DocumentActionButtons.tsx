'use client'

import { Eye, Download } from 'lucide-react'

interface DocumentActionButtonsProps {
  docId: string | null
  onPreview?: () => void
  previewLabel?: string
  downloadLabel?: string
  className?: string
}

export function DocumentActionButtons({
  docId,
  onPreview,
  previewLabel = 'Preview',
  downloadLabel = 'Download',
  className = '',
}: DocumentActionButtonsProps) {
  if (!docId) return null

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {onPreview && (
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-[#ebebeb] hover:bg-gray-50 hover:text-black active:scale-95 transition-all rounded-[0.125rem]"
        >
          <Eye className="w-3.5 h-3.5" />
          {previewLabel}
        </button>
      )}

      <a
        href={`/api/documents/${docId}/view?download=1`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-[#ebebeb] hover:bg-gray-50 hover:text-black active:scale-95 transition-all rounded-[0.125rem]"
      >
        <Download className="w-3.5 h-3.5" />
        {downloadLabel}
      </a>
    </div>
  )
}
