"use client"

import { useState, useCallback, useMemo } from 'react'
import { Search } from 'lucide-react'
import { AddonCard } from '../addons/AddonCard'
import { OrderSummaryBar } from '../ui/OrderSummaryBar'
import type {
  OnboardingFormData, PublicAddon, PublicAddonCategory, SelectedAddon
} from '@/types/onboarding'

interface AddonsStepProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
  addons: PublicAddon[]
  categories: PublicAddonCategory[]
}

export function AddonsStep({ formData, onChange, addons, categories }: AddonsStepProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAddons = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return addons.filter(addon => {
      const categoryMatch = activeCategory === 'all' || addon.categoryIds.includes(activeCategory)
      const searchMatch = !query || [
        addon.name,
        ...addon.features,
        ...addon.categoryNames,
      ].join(' ').toLowerCase().includes(query)
      return categoryMatch && searchMatch
    })
  }, [addons, activeCategory, searchTerm])

  const toggleAddon = useCallback((addon: PublicAddon) => {
    const selectedList = formData.selectedAddons ?? []
    const isSelected = selectedList.some(a => a.id === addon.id)
    const updatedAddons: SelectedAddon[] = isSelected
      ? selectedList.filter(a => a.id !== addon.id)
      : [...selectedList, { id: addon.id, name: addon.name, price: addon.price }]

    const addonTotal = updatedAddons.reduce((sum, a) => sum + a.price, 0)
    onChange({ selectedAddons: updatedAddons, addonTotal })
  }, [formData.selectedAddons, onChange])

  return (
    <div className="w-full">
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 font-[Manrope]">
          Add-ons
        </h1>
        <p className="mt-2 text-sm sm:text-[15px] font-medium text-gray-500 leading-relaxed max-w-2xl">
          Enhance your LLC with optional services. All add-ons are optional.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={tabClass(activeCategory === 'all')}
              >
                All Services
              </button>
              {categories.map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={tabClass(activeCategory === cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-[320px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search add-ons"
                className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20"
              />
            </div>
          </div>

          {filteredAddons.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/60 py-14 text-center text-sm font-medium text-gray-400">
              No add-ons found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              {filteredAddons.map(addon => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  selected={(formData.selectedAddons ?? []).some(a => a.id === addon.id)}
                  onToggle={() => toggleAddon(addon)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-6">
          <OrderSummaryBar
            stateName={formData.formationStateName}
            stateFee={formData.stateFee}
            packageName={formData.selectedPackageName}
            packagePrice={formData.packagePrice}
            addonTotal={formData.addonTotal ?? 0}
            addons={formData.selectedAddons ?? []}
          />
        </div>
      </div>
    </div>
  )
}

function tabClass(active: boolean) {
  return [
    'rounded-full border px-4 py-2 text-xs font-bold transition-colors',
    active
      ? 'border-[#34088f] bg-[#34088f] text-white'
      : 'border-gray-200 bg-white text-gray-500 hover:border-[#34088f]/40 hover:text-[#34088f]',
  ].join(' ')
}
