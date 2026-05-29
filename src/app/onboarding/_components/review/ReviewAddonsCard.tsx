"use client"

import type { OnboardingFormData } from '@/types/onboarding'
import { ReviewCard, ReviewRow } from './ReviewSection'

export function ReviewAddonsCard({
  formData,
  onEdit,
}: {
  formData: OnboardingFormData
  onEdit: () => void
}) {
  const addons = formData.selectedAddons ?? []
  const addonTotal = formData.addonTotal ?? 0

  return (
    <ReviewCard title="Add-ons" onEdit={onEdit}>
      {addons.length === 0 ? (
        <ReviewRow label="Add-ons" value="None selected" />
      ) : (
        addons.map(addon => (
          <ReviewRow
            key={addon.id}
            label={addon.name}
            value={`$${addon.price.toLocaleString()}`}
          />
        ))
      )}
      {addons.length > 0 && (
        <ReviewRow
          label="Add-ons Total"
          value={`$${addonTotal.toLocaleString()}`}
        />
      )}
    </ReviewCard>
  )
}
