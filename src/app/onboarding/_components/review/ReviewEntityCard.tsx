"use client"

import type { OnboardingFormData } from '@/types/onboarding'
import { ReviewCard, ReviewRow } from './ReviewSection'

interface ReviewEntityCardProps {
  formData: OnboardingFormData
  onEdit: () => void
}

export function ReviewEntityCard({ formData, onEdit }: ReviewEntityCardProps) {
  return (
    <ReviewCard title="Entity Type" onEdit={onEdit}>
      <ReviewRow label="Entity" value="US LLC" />
      <ReviewRow
        label="Structure"
        value={
          formData.memberType === 'single-member'
            ? 'Single Member LLC'
            : 'Multi Member LLC'
        }
      />
    </ReviewCard>
  )
}
