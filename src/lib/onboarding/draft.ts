// src/lib/onboarding/draft.ts

/**
 * Utility to save onboarding step draft optimistic/debounced to save-step endpoint.
 */
export async function saveStepDraft(params: {
  tempSessionKey: string
  stepIndex: number
  formData: Record<string, unknown>
  completedSteps: number[]
}) {
  try {
    const res = await fetch('/api/onboarding/save-step', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      throw new Error('Failed to save draft')
    }
    return await res.json()
  } catch (error) {
    console.error('Error saving step draft:', error)
    return { error }
  }
}
