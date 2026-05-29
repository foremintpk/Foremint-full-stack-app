"use client"

import type { OnboardingFormData } from '@/types/onboarding'
import { ReviewCard, ReviewRow } from './ReviewSection'

export function ReviewMembersCard({
  formData,
  onEdit,
}: {
  formData: OnboardingFormData
  onEdit: () => void
}) {
  const members = formData.members ?? []

  return (
    <ReviewCard title="Members" onEdit={onEdit}>
      {members.length === 0 ? (
        <ReviewRow label="Members" value="None added" />
      ) : (
        members.map((member, i) => (
          <div
            key={member.id}
            className={i > 0 ? 'border-t border-gray-100 pt-2 mt-1' : ''}
          >
            <p className="text-xs font-semibold text-gray-600 mb-1.5">
              {formData.memberType === 'single-member'
                ? 'Primary Member'
                : `Member ${i + 1}`}
              {member.position && (
                <span className="ml-2 text-[10px] bg-[#f4f0fe] text-[#34088f] px-2 py-0.5 rounded-full font-medium capitalize">
                  {member.position.replace('-', ' ')}
                </span>
              )}
            </p>
            <ReviewRow label="Full Name" value={member.fullName} />
            <ReviewRow
              label="Address"
              value={member.addressLine1 || 'N/A'}
            />
            <ReviewRow
              label="Document"
              value={member.documentFileName ?? 'Not uploaded'}
            />
          </div>
        ))
      )}
    </ReviewCard>
  )
}
