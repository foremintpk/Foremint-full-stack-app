'use client';

import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Entity Type', subtitle: 'Structure' },
  { id: 2, label: 'Formation', subtitle: 'Package' },
  { id: 3, label: 'Business Info', subtitle: 'Company' },
  { id: 4, label: 'Members', subtitle: 'Management' },
  { id: 5, label: 'Add-ons', subtitle: 'Services' },
  { id: 6, label: 'Account', subtitle: 'Registration' },
  { id: 7, label: 'Review', subtitle: 'Summary' },
  { id: 8, label: 'Payment', subtitle: 'Finalize' },
];

export function SidebarNav() {
  const { currentStep, isStepComplete, isStepAccessible, navigateToStep } = useOnboarding();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const calculateProgress = (completed: number[]) => {
    // Total steps is now 8
    return Math.min(100, Math.round((completed.length / 8) * 100));
  };

  const progress = isMounted ? calculateProgress(STEPS.filter(s => isStepComplete(s.id)).map(s => s.id)) : 0;

  return (
    <div className="h-full flex flex-col p-8 bg-white border-r border-gray-100 min-w-[280px]">
      {/* Logo */}
      <div className="mb-12">
        <span className="text-xl font-black uppercase tracking-tighter text-[#34088f] font-manrope">Foremint</span>
      </div>

      {/* Step List */}
      <nav className="flex-1 space-y-6">
        {STEPS.map(({ id, label, subtitle }) => {
          const isActive = currentStep === id;
          const isCompleted = isStepComplete(id);
          const isAccessible = isStepAccessible(id);

          return (
            <button
              key={id}
              onClick={() => isAccessible && !isActive && navigateToStep(id)}
              disabled={!isAccessible}
              className={cn(
                "w-full flex items-center gap-4 group text-left transition-all",
                !isAccessible && "opacity-40 cursor-not-allowed"
              )}
            >
              {/* Indicator */}
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                isCompleted ? "bg-black border-black text-white" :
                isActive ? "bg-[#34088f] border-[#34088f] text-white" :
                "bg-transparent border-gray-200"
              )}>
                {isCompleted ? (
                  <Check className="w-3 h-3" strokeWidth={4} />
                ) : (
                  <span className="text-[10px] font-black">{id}</span>
                )}
              </div>

              {/* Label */}
              <div className="flex flex-col">
                <span className={cn(
                  "text-[13px] font-bold tracking-tight transition-colors duration-300",
                  isActive ? "text-[#34088f] font-manrope" :
                  isCompleted ? "text-black font-inter" :
                  "text-gray-400 font-inter"
                )}>
                  {label}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 group-hover:text-gray-400 transition-colors">
                  {subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Progress Footer */}
      <div className="pt-8 border-t border-gray-50 mt-8">
        <div className="flex justify-between items-center mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-inter">Onboarding</p>
          <p className="text-[14px] font-black uppercase tracking-widest text-black font-manrope">{progress}%</p>
        </div>
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#34088f] h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(52,8,143,0.3)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
