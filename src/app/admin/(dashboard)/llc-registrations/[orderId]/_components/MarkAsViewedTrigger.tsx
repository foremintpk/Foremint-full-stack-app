/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/MarkAsViewedTrigger.tsx
 * @description Silent client trigger to register page opening and update unread indicators.
 */

'use client';

import { useEffect, useRef } from 'react';
import { markOrderViewed } from '@/lib/admin/actions/markOrderViewed';

interface MarkAsViewedTriggerProps {
  orderId: string;
  adminId: string;
}

export function MarkAsViewedTrigger({
  orderId,
  adminId,
}: MarkAsViewedTriggerProps) {
  const fired = useRef(false);

  useEffect(() => {
    // Fire only once on mount per session to prevent redundant updates
    if (fired.current) return;
    fired.current = true;

    async function trigger() {
      try {
        await markOrderViewed(orderId, adminId);
      } catch (err) {
        console.error('[MarkAsViewedTrigger Error]:', err);
      }
    }
    trigger();
  }, [orderId, adminId]);

  return null;
}
