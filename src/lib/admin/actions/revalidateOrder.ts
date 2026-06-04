/**
 * @file src/lib/admin/actions/revalidateOrder.ts
 * @description Helper server action to revalidate the cache of a specific order detail.
 */

'use server';

import { revalidateTag, revalidatePath } from 'next/cache';

export async function revalidateOrder(orderId: string): Promise<void> {
  if (!orderId) return;
  revalidateTag(`order-${orderId}`, 'max');
  revalidateTag(`order-internal-${orderId}`, 'max');
  revalidateTag('order-list-llc', 'max');
  (revalidatePath as any)(`/admin/llc-registrations/${orderId}`, 'layout');
}
