"use client"

import { ReviewEntityCard } from '../review/ReviewEntityCard'
import { ReviewFormationCard } from '../review/ReviewFormationCard'
import { ReviewBusinessCard } from '../review/ReviewBusinessCard'
import { ReviewMembersCard } from '../review/ReviewMembersCard'
import { ReviewAddonsCard } from '../review/ReviewAddonsCard'
import { OrderSummaryBar } from '../ui/OrderSummaryBar'
import type { OnboardingFormData } from '@/types/onboarding'

interface ReviewStepProps {
  formData: OnboardingFormData
  onEditStep: (stepIndex: number) => void
}

export function ReviewStep({ formData, onEditStep }: ReviewStepProps) {
  return (
    <div className="w-full">
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-950 font-[Manrope]">
          Review Your Application
        </h1>
        <p className="mt-2 text-sm sm:text-[15px] font-medium text-gray-500 leading-relaxed max-w-2xl">
          Review each section before payment. You can edit any section without losing progress.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ReviewEntityCard formData={formData} onEdit={() => onEditStep(1)} />
          <ReviewFormationCard formData={formData} onEdit={() => onEditStep(2)} />
          <ReviewBusinessCard formData={formData} onEdit={() => onEditStep(3)} />
          <ReviewMembersCard formData={formData} onEdit={() => onEditStep(4)} />
          <div className="lg:col-span-2">
            <ReviewAddonsCard formData={formData} onEdit={() => onEditStep(5)} />
          </div>
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
