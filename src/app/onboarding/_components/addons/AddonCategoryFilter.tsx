"use client"

import type { PublicAddonCategory } from '@/types/onboarding'

interface AddonCategoryFilterProps {
  categories: PublicAddonCategory[]
  activeCategory: string
  onSelect: (id: string) => void
}

export function AddonCategoryFilter({
  categories, activeCategory, onSelect,
}: AddonCategoryFilterProps) {
  const allTab = { id: 'all', name: 'All' }
  const tabs = [allTab, ...categories]

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={[
            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 border',
            activeCategory === tab.id
              ? 'bg-[#34088f] text-white border-[#34088f]'
              : 'bg-white text-gray-500 border-gray-200 hover:border-[#34088f]/40 hover:text-[#34088f]',
          ].join(' ')}
        >
          {tab.name}
        </button>
      ))}
    </div>
  )
}
