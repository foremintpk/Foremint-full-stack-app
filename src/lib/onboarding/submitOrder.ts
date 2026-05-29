import type { OrderSubmissionPayload, OrderSubmissionResult } from '@/types/onboarding'

export async function submitOrder(
  payload: OrderSubmissionPayload
): Promise<OrderSubmissionResult> {
  const res = await fetch('/api/onboarding/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as OrderSubmissionResult

  if (!res.ok) {
    return {
      success: false,
      error: data.error ?? 'Failed to submit order.',
    }
  }

  return data
}
