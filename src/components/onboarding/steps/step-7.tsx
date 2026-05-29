'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useOnboarding } from '@/context/onboarding-context'
import { createClient } from '@/lib/supabase/client'
import { StepFooter } from '../ui/step-footer'
import { FieldError } from '../ui/field-error'
import { PaymentStep } from '@/app/onboarding/_components/steps/PaymentStep'
import { mergeFormDataFromSteps } from '@/lib/onboarding/mergeFormData'
import { validatePayment } from '@/lib/onboarding/validation'
import { submitOrder } from '@/lib/onboarding/submitOrder'
import { clearOnboardingArtifacts } from '@/lib/onboarding-utils'
import type { OnboardingFormData } from '@/types/onboarding'

export default function Step7() {
  const router = useRouter()
  const { state, saveStepData, dispatch } = useOnboarding()
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const merged = useMemo(
    () => mergeFormDataFromSteps(state.formData as Record<number, unknown>),
    [state.formData]
  )

  const paymentSlice = useMemo(
    () => (state.formData[7] ?? {}) as Partial<OnboardingFormData>,
    [state.formData]
  )

  const formData = useMemo(
    (): OnboardingFormData => ({
      ...merged,
      paymentMethod: paymentSlice.paymentMethod ?? merged.paymentMethod ?? null,
      receiptUrl: paymentSlice.receiptUrl ?? merged.receiptUrl ?? null,
      receiptPublicId: paymentSlice.receiptPublicId ?? merged.receiptPublicId ?? null,
      receiptFileName: paymentSlice.receiptFileName ?? merged.receiptFileName ?? null,
    }),
    [merged, paymentSlice]
  )

  const handleChange = useCallback(
    (updates: Partial<OnboardingFormData>) => {
      saveStepData(7, { ...paymentSlice, ...updates })
    },
    [saveStepData, paymentSlice]
  )

  const handleContinue = async () => {
    const error = validatePayment(formData)
    if (error) {
      setValidationError(error)
      toast.error(error)
      return
    }

    setValidationError(null)
    setIsSubmitting(true)
    dispatch({ type: 'SET_ORDER_SUBMIT_STATUS', status: 'submitting' })

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to submit your order.')
        setIsSubmitting(false)
        dispatch({ type: 'SET_ORDER_SUBMIT_STATUS', status: 'idle' })
        return
      }

      const draftRes = await fetch(
        `/api/onboarding/draft?key=${encodeURIComponent(state.tempSessionKey ?? '')}`
      )
      const draftJson = (await draftRes.json()) as { draft?: { id: string; status: string } }
      if (draftJson.draft?.status === 'completed') {
        toast.error('This order has already been submitted.')
        setIsSubmitting(false)
        dispatch({ type: 'SET_ORDER_SUBMIT_STATUS', status: 'idle' })
        return
      }

      const result = await submitOrder({
        draftId: draftJson.draft?.id ?? '',
        tempSessionKey: state.tempSessionKey ?? '',
        userId: user.id,
        formData,
        receiptUrl: formData.receiptUrl ?? null,
        receiptPublicId: formData.receiptPublicId ?? null,
      })

      if (!result.success) {
        toast.error(result.error ?? 'Failed to submit order.')
        setIsSubmitting(false)
        dispatch({ type: 'SET_ORDER_SUBMIT_STATUS', status: 'idle' })
        return
      }

      saveStepData(7, {
        paymentMethod: formData.paymentMethod,
        receiptUrl: formData.receiptUrl,
        receiptPublicId: formData.receiptPublicId,
        receiptFileName: formData.receiptFileName,
      })
      clearOnboardingArtifacts()
      dispatch({ type: 'RESET' })

      const params = new URLSearchParams({
        orderNumber: result.orderNumber ?? result.orderId ?? '',
        businessName: formData.businessName || 'your business',
      })
      router.push(`/onboarding/thank-you?${params.toString()}`)
    } catch (err) {
      console.error('Order submission error:', err)
      toast.error('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
      dispatch({ type: 'SET_ORDER_SUBMIT_STATUS', status: 'idle' })
    }
  }

  return (
    <div className="space-y-6">
      <PaymentStep formData={formData} onChange={handleChange} />

      {validationError && (
        <div className="max-w-xl">
          <FieldError error={validationError} />
        </div>
      )}

      <StepFooter currentStep={7} isSubmitting={isSubmitting} onContinue={handleContinue} />
    </div>
  )
}
