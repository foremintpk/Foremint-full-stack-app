'use client';

import React from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
  const { state } = useOnboarding();
  const { syncStatus } = state;

  if (syncStatus === 'idle') return null;

  return (
    <div className="mt-auto pt-6 border-t border-gray-100 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      {syncStatus === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
          <span className="text-[12px] font-medium text-gray-500 font-inter">Saving…</span>
        </>
      )}
      {syncStatus === 'saved' && (
        <>
          <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
          <span className="text-[12px] font-medium text-[#10B981] font-inter">Saved</span>
        </>
      )}
      {syncStatus === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-[#EF4444]" />
          <span className="text-[12px] font-medium text-[#EF4444] font-inter">Save failed — retrying</span>
        </>
      )}
    </div>
  );
}
