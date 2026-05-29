"use client"

import { useOnboarding } from '@/context/onboarding-context'
import { Loader2, ArrowRight } from 'lucide-react'

interface OnboardingContinueButtonProps {
  currentStep: number
  totalSteps: number
  onContinue?: () => Promise<boolean> // returns true if validation passed
}

export function OnboardingContinueButton({
  currentStep,
  totalSteps,
}: OnboardingContinueButtonProps) {
  const { isPending, state } = useOnboarding()
  const isLastStep = currentStep === totalSteps
  const isSubmittingOrder = state.orderSubmitStatus === 'submitting'

  const handleClick = async () => {
    // Dispatch custom event to trigger form validation in the active step
    const event = new CustomEvent('foremint-onboarding-continue')
    window.dispatchEvent(event)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || isSubmittingOrder}
      className="
        group flex items-center gap-1.5
        bg-[#34088f] hover:bg-[#2a0778] active:bg-[#220660]
        disabled:opacity-60 disabled:cursor-not-allowed
        text-white text-[13px] font-semibold
        px-6 py-2.5 rounded-full
        transition-all duration-150 font-inter
        shadow-[0_2px_8px_rgba(52,8,143,0.25)]
      "
    >
      {(isPending || isSubmittingOrder) && <Loader2 size={15} className="animate-spin" />}
      <span>{isSubmittingOrder ? 'Submitting...' : isLastStep ? 'Submit Order' : 'Next'}</span>
      {!isPending && !isSubmittingOrder && !isLastStep && (
        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-150" />
      )}
    </button>
  )
}
