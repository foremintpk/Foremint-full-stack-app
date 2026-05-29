"use client"

import type { OnboardingFormData } from '@/types/onboarding'
import { ReviewCard, ReviewRow } from './ReviewSection'

export function ReviewBusinessCard({
  formData,
  onEdit,
}: {
  formData: OnboardingFormData
  onEdit: () => void
}) {
  return (
    <ReviewCard title="Business Information" onEdit={onEdit}>
      <ReviewRow
        label="Business Name"
        value={formData.businessName || 'N/A'}
      />
      <ReviewRow
        label="Secondary Business Name"
        value={formData.secondaryBusinessName || 'N/A'}
      />
      <ReviewRow label="Website" value={formData.businessWebsite || 'N/A'} />
      <ReviewRow label="Category" value={formData.businessCategory || 'N/A'} />
      <ReviewRow
        label="Description"
        value={formData.businessDescription || 'N/A'}
      />
    </ReviewCard>
  )
}
