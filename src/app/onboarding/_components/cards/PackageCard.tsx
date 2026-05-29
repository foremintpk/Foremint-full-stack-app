"use client"

import { Check } from 'lucide-react'
import type { PublicPackage } from '@/types/onboarding'

interface PackageCardProps {
  pkg: PublicPackage
  selected: boolean
  onSelect: () => void
}

export function PackageCard({ pkg, selected, onSelect }: PackageCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex h-full min-h-[310px] flex-col text-left p-5 rounded-lg border w-full',
        'transition-all duration-150 hover:shadow-[0_10px_28px_rgba(52,8,143,0.08)]',
        selected
          ? 'border-[#34088f] bg-[#f8f5ff] shadow-[0_0_0_1px_#34088f]'
          : 'border-[#e0d9f7] bg-white hover:border-[#34088f]/45',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className={['text-base font-bold leading-tight', selected ? 'text-[#34088f]' : 'text-gray-950'].join(' ')}>
          {pkg.name}
        </h3>
        <span className="shrink-0 text-xl font-extrabold text-[#34088f] font-[Manrope]">
          ${pkg.price.toLocaleString()}
        </span>
      </div>

      <div className="my-5 h-px w-full bg-[#e0d9f7]" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Included in this package
        </p>
        <span
          className={[
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-[#34088f] bg-[#34088f]' : 'border-gray-300 bg-white',
          ].join(' ')}
        >
          {selected && <Check size={12} className="text-white stroke-[3]" />}
        </span>
      </div>

      <ul className="flex flex-1 flex-col gap-3">
        {pkg.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4f0fe] text-[#34088f]">
              <Check size={12} className="stroke-[3]" />
            </span>
            <span className="text-sm text-gray-600 leading-relaxed">{feature}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}
