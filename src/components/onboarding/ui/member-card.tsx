'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Trash2 } from 'lucide-react';

interface MemberCardProps {
  isExpanded: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  memberName: string;
  position?: string;
  children: React.ReactNode;
  canRemove: boolean;
}

export function MemberCard({
  isExpanded,
  onToggle,
  onRemove,
  memberName,
  position,
  children,
  canRemove,
}: MemberCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  return (
    <div className={cn(
      "border rounded-sm transition-all duration-300 overflow-hidden",
      isExpanded ? "border-[#34088f] shadow-lg shadow-[#34088f]/5" : "border-gray-200"
    )}>
      {/* Header */}
      <div 
        className={cn(
          "px-6 py-4 flex items-center justify-between cursor-pointer select-none",
          isExpanded ? "bg-[#F5F0FF]/50 border-b border-[#34088f]/10" : "bg-white hover:bg-gray-50"
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.action-btn')) return;
          onToggle();
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h3 className={cn(
              "text-[14px] font-black uppercase tracking-tight font-manrope",
              isExpanded ? "text-[#34088f]" : "text-black"
            )}>
              {memberName || "New Member"}
            </h3>
            {position && (
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                {position}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canRemove && (
            <div className="action-btn flex items-center">
              {showConfirmDelete ? (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95">
                  <span className="text-[11px] font-bold text-[#EF4444] font-inter">Remove?</span>
                  <button 
                    onClick={onRemove}
                    className="text-[11px] font-black uppercase tracking-widest text-[#EF4444] hover:underline font-inter"
                  >
                    Yes
                  </button>
                  <button 
                    onClick={() => setShowConfirmDelete(false)}
                    className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-black font-inter"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowConfirmDelete(true)}
                  className="text-gray-300 hover:text-[#EF4444] transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <ChevronDown className={cn(
            "w-5 h-5 text-gray-400 transition-transform duration-300",
            isExpanded && "rotate-180 text-[#34088f]"
          )} />
        </div>
      </div>

      {/* Body */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
      )}>
        <div className="p-8 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
