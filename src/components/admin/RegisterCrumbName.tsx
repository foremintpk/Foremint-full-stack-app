'use client';

/**
 * Registers an id → display-name mapping so AdminBreadcrumb renders a friendly
 * label (e.g. a blog title) instead of a raw UUID path segment. Renders nothing.
 */

import { useEffect } from 'react';
import { useLlcNames } from '@/context/llc-name-context';

export function RegisterCrumbName({ id, name }: { id: string; name: string }) {
  const { registerLlcName } = useLlcNames();
  useEffect(() => {
    if (id && name) registerLlcName(id, name);
  }, [id, name, registerLlcName]);
  return null;
}
