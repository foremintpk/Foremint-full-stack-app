"use client"

import { Check } from 'lucide-react'

interface EntityCardProps {
  label: string
  description: string
  value: string
  selected: boolean
  onSelect: () => void
  comingSoon?: boolean
}

export function EntityCard({
  label, description, selected, onSelect, comingSoon = false,
}: EntityCardProps) {
  return (
    <button
      type="button"
      onClick={comingSoon ? undefined : onSelect}
      disabled={comingSoon}
      className={[
        'relative min-h-[150px] flex flex-col items-start justify-between p-5 rounded-lg border text-left w-full',
        'transition-all duration-150',
        selected
          ? 'border-[#34088f] bg-[#f8f5ff] shadow-[0_0_0_1px_#34088f]'
          : 'border-gray-200 bg-white hover:border-[#34088f]/40 hover:shadow-[0_8px_24px_rgba(52,8,143,0.06)]',
        comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <div className="flex w-full items-start justify-between gap-4">
        <div>
          <span className={['text-base font-bold', selected ? 'text-[#34088f]' : 'text-gray-950'].join(' ')}>
            {label}
          </span>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
        </div>
        <span
          className={[
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-[#34088f] bg-[#34088f]' : 'border-gray-300 bg-white',
          ].join(' ')}
        >
          {selected && <Check size={12} className="text-white stroke-[3]" />}
        </span>
      </div>

      {comingSoon && (
        <span className="mt-5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500">
          Coming Soon
        </span>
      )}
    </button>
  )
}
