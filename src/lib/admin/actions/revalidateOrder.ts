/**
 * @file src/lib/admin/actions/revalidateOrder.ts
 * @description Helper server action to revalidate the cache of a specific order detail.
 */

'use server';

import { revalidateTag, revalidatePath } from 'next/cache';

export async function revalidateOrder(orderId: string): Promise<void> {
  if (!orderId) return;
  (revalidateTag as any)(`order-${orderId}`);
  (revalidateTag as any)(`order-internal-${orderId}`);
  (revalidateTag as any)('order-list-llc');
  (revalidatePath as any)(`/admin/llc-registrations/${orderId}`, 'layout');
}
