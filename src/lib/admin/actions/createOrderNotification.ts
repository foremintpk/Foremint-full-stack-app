'use server'

import { revalidateTag } from 'next/cache'

export async function revalidateAfterNewOrder(adminId?: string): Promise<void> {
  revalidateTag('order-list', 'max')
  revalidateTag('overview-stats', 'max')

  if (adminId) {
    revalidateTag(`notif-count-${adminId}`, 'max')
    revalidateTag(`notif-list-${adminId}`, 'max')
    revalidateTag(`nav-badges-${adminId}`, 'max')
  } else {
    revalidateTag('notif-count-admin', 'max')
    revalidateTag('notif-list-admin', 'max')
  }
}
