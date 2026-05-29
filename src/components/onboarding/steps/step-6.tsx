'use client'

import { useMemo, useState } from 'react'
import { useOnboarding } from '@/context/onboarding-context'
import { StepFooter } from '../ui/step-footer'
import { FieldError } from '../ui/field-error'
import { ReviewStep } from '@/app/onboarding/_components/steps/ReviewStep'
import { mergeFormDataFromSteps } from '@/lib/onboarding/mergeFormData'
import { validateReview } from '@/lib/onboarding/validation'
import { toast } from 'sonner'

export default function Step6() {
  const { state, dispatch, navigateToStep, goToNextStep } = useOnboarding()
  const [validationError, setValidationError] = useState<string | null>(null)

  const formData = useMemo(
    () => mergeFormDataFromSteps(state.formData as Record<number, unknown>),
    [state.formData]
  )

  const handleEditStep = (stepIndex: number) => {
    dispatch({ type: 'SET_RETURN_TO_REVIEW', value: true })
    navigateToStep(stepIndex)
  }

  const handleContinue = () => {
    const error = validateReview(formData)
    if (error) {
      setValidationError(error)
      toast.error(error)
      return
    }
    setValidationError(null)
    goToNextStep()
  }

  return (
    <div className="space-y-6">
      <ReviewStep formData={formData} onEditStep={handleEditStep} />

      {validationError && (
        <div className="max-w-xl">
          <FieldError error={validationError} />
        </div>
      )}

      <StepFooter currentStep={6} onContinue={handleContinue} />
    </div>
  )
}
