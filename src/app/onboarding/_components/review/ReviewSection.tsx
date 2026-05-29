"use client"

import { Pencil } from 'lucide-react'

export function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="h-full rounded-lg border border-[#e0d9f7] bg-white overflow-hidden shadow-[0_8px_24px_rgba(52,8,143,0.04)]">
      <div className="flex items-center justify-between gap-4 px-5 py-4 bg-[#f8f5ff] border-b border-[#e0d9f7]">
        <span className="text-base font-semibold text-gray-950">{title}</span>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-md border border-[#e0d9f7] bg-white px-2.5 py-1.5 text-xs text-[#34088f] hover:text-[#2a0778] font-semibold transition-colors"
        >
          <Pencil size={12} />
          Edit
        </button>
      </div>
      <div className="px-5 py-4 grid grid-cols-1 gap-3">{children}</div>
    </div>
  )
}

export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-semibold text-right">{value || '-'}</span>
    </div>
  )
}
