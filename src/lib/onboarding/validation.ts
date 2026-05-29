import type { OnboardingFormData } from '@/types/onboarding'

export function validateReview(_formData: OnboardingFormData): string | null {
  return null
}

export function validatePayment(formData: OnboardingFormData): string | null {
  if (!formData.paymentMethod) {
    return 'Please select a payment method.'
  }
  if (formData.paymentMethod === 'bank-transfer' && !formData.receiptUrl) {
    return null
  }
  return null
}
