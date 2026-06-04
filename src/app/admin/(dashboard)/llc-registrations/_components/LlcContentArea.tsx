'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLlcNavigation } from '@/context/llc-navigation-context';

interface LlcContentAreaProps {
  children: React.ReactNode;
}

export default function LlcContentArea({ children }: LlcContentAreaProps): React.JSX.Element {
  const { isPending } = useLlcNavigation();

  return (
    <div className="relative">
      {isPending && (
        <div
          aria-busy="true"
          aria-label="Loading results"
          className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[1px]"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#34088f]" />
            <span className="text-xs font-semibold text-[#34088f] font-inter">Loading...</span>
          </div>
        </div>
      )}
      <div className={isPending ? 'pointer-events-none select-none' : ''}>
        {children}
      </div>
    </div>
  );
}
