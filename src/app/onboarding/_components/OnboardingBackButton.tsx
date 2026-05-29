"use client"

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OnboardingBackButtonProps {
  currentStep: number
}

export function OnboardingBackButton({ currentStep }: OnboardingBackButtonProps) {
  const router = useRouter()

  // Hidden on step 1 — nothing to go back to
  if (currentStep <= 1) return <div className="w-16" /> // spacer to preserve flex layout

  return (
    <button
      type="button"
      onClick={() => router.push(`/onboarding/step/${currentStep - 1}`)}
      className="
        flex items-center gap-1.5 text-[13px] text-gray-500
        hover:text-gray-900 transition-colors duration-150
        font-medium rounded-full px-3 py-1.5 font-inter
        hover:bg-gray-100 active:bg-gray-200
      "
    >
      <ChevronLeft size={16} strokeWidth={2} />
      Back
    </button>
  )
}
