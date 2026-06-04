'use client';

import { useEffect, useRef } from 'react';
import { markOrderViewed } from '@/lib/admin/actions/markOrderViewed';
import { useAdminBadge } from '@/context/admin-badge-context';

interface MarkAsViewedTriggerProps {
  orderId: string;
  adminId: string;
}

export function MarkAsViewedTrigger({ orderId, adminId }: MarkAsViewedTriggerProps) {
  const fired = useRef(false);
  const { decrementLlcOrderBadge } = useAdminBadge();

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    async function trigger() {
      try {
        await markOrderViewed(orderId, adminId);
        // Immediately decrement the sidebar badge — no page reload required
        decrementLlcOrderBadge();
      } catch (err) {
        console.error('[MarkAsViewedTrigger Error]:', err);
      }
    }
    trigger();
  }, [orderId, adminId, decrementLlcOrderBadge]);

  return null;
}
