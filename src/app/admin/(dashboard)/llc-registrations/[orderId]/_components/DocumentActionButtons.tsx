'use client'

import { Eye, Download } from 'lucide-react'
import { triggerDocumentDownload } from '@/lib/download-file'

interface DocumentActionButtonsProps {
  url: string
  fileName: string
  onPreview?: () => void
  previewLabel?: string
  downloadLabel?: string
  className?: string
}

export function DocumentActionButtons({
  url,
  fileName,
  onPreview,
  previewLabel = 'Preview',
  downloadLabel = 'Download',
  className = '',
}: DocumentActionButtonsProps) {
  if (!url) return null

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

      <button
        type="button"
        onClick={() => triggerDocumentDownload(url, fileName)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-[#ebebeb] hover:bg-gray-50 hover:text-black active:scale-95 transition-all rounded-[0.125rem]"
      >
        <Download className="w-3.5 h-3.5" />
        {downloadLabel}
      </button>
    </div>
  )
}
