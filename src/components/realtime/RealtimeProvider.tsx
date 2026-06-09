'use client';

import { createContext, useContext, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

const RealtimeContext = createContext<SupabaseClient | null>(null);

/**
 * Wraps a subtree with a single shared Supabase client instance.
 * All child components call useRealtime() instead of createClient() so the
 * entire dashboard shares one WebSocket connection rather than spawning one
 * per component.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  return (
    <RealtimeContext.Provider value={supabase}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): SupabaseClient {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be called inside <RealtimeProvider>');
  return ctx;
}
