'use client';

/**
 * Locks document (html/body) scrolling while the admin dashboard is mounted, so
 * the app-shell's <main> is the single scroll container and no outer/body
 * scrollbar can appear. Renders nothing.
 */

import { useEffect } from 'react';

export function AdminScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('admin-no-scroll');
    return () => html.classList.remove('admin-no-scroll');
  }, []);
  return null;
}
