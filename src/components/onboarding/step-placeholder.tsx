'use client';

import React from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export function StepPlaceholder({ stepNumber }: { stepNumber: number }) {
  const { goToNextStep, goToPrevStep } = useOnboarding();

  return (
    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-4 mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tight text-black font-manrope">
          Step {stepNumber} — Coming Soon
        </h1>
        <p className="text-lg font-medium text-gray-500 leading-relaxed font-inter">
          This step is part of the next development chunk. For now, you can test the navigation and draft persistence shell.
        </p>
      </div>

      <div className="flex items-center gap-4 pt-8 border-t border-gray-100">
        {stepNumber > 1 && (
          <button
            onClick={goToPrevStep}
            className="flex items-center gap-2 px-6 py-3 text-[12px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        
        {stepNumber < 9 && (
          <button
            onClick={goToNextStep}
            className="flex items-center gap-2 px-8 py-4 bg-[#34088f] text-white text-[12px] font-black uppercase tracking-[0.2em] rounded-sm hover:bg-[#2a0674] transition-all shadow-xl shadow-[#34088f]/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
