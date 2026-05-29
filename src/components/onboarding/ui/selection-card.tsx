'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface SelectionCardProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  subLabel?: string;
  description: string;
  icon?: React.ReactNode;
}

export function SelectionCard({
  selected,
  onClick,
  label,
  subLabel,
  description,
  icon,
}: SelectionCardProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={cn(
        "relative flex flex-col p-6 border transition-all duration-300 cursor-pointer rounded-sm group",
        selected 
          ? "border-[#34088f] bg-[#F5F0FF] border-2" 
          : "border-gray-200 bg-white hover:border-[#34088f]/50 hover:bg-[#F5F0FF]/30"
      )}
    >
      {/* Selection Indicator */}
      <div className={cn(
        "absolute top-4 right-4 transition-all duration-500",
        selected ? "scale-100 opacity-100" : "scale-0 opacity-0"
      )}>
        <CheckCircle2 className="w-5 h-5 text-[#34088f] fill-white" />
      </div>

      {/* Icon & Label */}
      <div className="flex items-start gap-4 mb-4">
        {icon && <div className="text-gray-400 group-hover:text-[#34088f] transition-colors">{icon}</div>}
        <div>
          <h3 className="text-[16px] font-black uppercase tracking-tight text-black font-manrope leading-none mb-1">
            {label}
          </h3>
          {subLabel && (
            <p className="text-[11px] font-black uppercase tracking-widest text-[#34088f]">
              {subLabel}
            </p>
          )}
        </div>
      </div>

      <p className="text-[13px] font-medium text-gray-500 leading-relaxed font-inter">
        {description}
      </p>
    </div>
  );
}
