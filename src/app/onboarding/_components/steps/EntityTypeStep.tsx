"use client"

import type { OnboardingFormData } from '@/types/onboarding'
import { EntityCard } from '../cards/EntityCard'

interface EntityTypeStepProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
}

export function EntityTypeStep({ formData, onChange }: EntityTypeStepProps) {
  return (
    <div className="w-full">
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 font-[Manrope]">
          Let&apos;s build your company together
        </h1>
        <p className="mt-2 text-sm sm:text-[15px] font-medium text-gray-500 leading-relaxed">
          Choose your company structure to begin with.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EntityCard
          label="Single Member"
          description="Best for one owner forming a US LLC."
          value="single-member"
          selected={formData.entityType === 'us-llc' && formData.memberType === 'single-member'}
          onSelect={() => onChange({ entityType: 'us-llc', memberType: 'single-member' })}
        />
        <EntityCard
          label="Multi Member"
          description="Best for two or more members or owners."
          value="multi-member"
          selected={formData.entityType === 'us-llc' && formData.memberType === 'multi-member'}
          onSelect={() => onChange({ entityType: 'us-llc', memberType: 'multi-member' })}
        />
        <EntityCard
          label="Corporation"
          description="Corporate formation options are being prepared."
          value="corporation"
          selected={false}
          onSelect={() => {}}
          comingSoon
        />
      </div>
    </div>
  )
}
