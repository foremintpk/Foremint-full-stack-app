"use client"

import type { OnboardingFormData } from '@/types/onboarding'
import { ReviewCard, ReviewRow } from './ReviewSection'

export function ReviewFormationCard({
  formData,
  onEdit,
}: {
  formData: OnboardingFormData
  onEdit: () => void
}) {
  return (
    <ReviewCard title="Formation" onEdit={onEdit}>
      <ReviewRow label="State" value={formData.formationStateName ?? '—'} />
      <ReviewRow
        label="State Fee"
        value={formData.stateFee > 0 ? `$${formData.stateFee.toLocaleString()}` : '—'}
      />
      <ReviewRow label="Package" value={formData.selectedPackageName ?? '—'} />
      <ReviewRow
        label="Package Price"
        value={
          formData.packagePrice > 0 ? `$${formData.packagePrice.toLocaleString()}` : '—'
        }
      />
    </ReviewCard>
  )
}
