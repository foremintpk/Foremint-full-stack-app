/**
 * @file src/lib/admin/actions/revalidateLlcList.ts
 * @description Server Action to revalidate LLC order list and top-level stats tags.
 */

'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateLlcList(): Promise<void> {
  (revalidateTag as any)('order-list-llc');
  (revalidateTag as any)('order-list-llc-stats');
}
