import React from 'react';

interface StepHeaderProps {
  title: string;
  subtitle: string;
}

export function StepHeader({ title, subtitle }: StepHeaderProps) {
  return (
    <div className="mb-8 border-b border-gray-200 pb-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 font-manrope">
        {title}
      </h1>
      <p className="mt-2 text-sm sm:text-[15px] font-medium text-gray-500 leading-relaxed font-inter max-w-2xl">
        {subtitle}
      </p>
    </div>
  );
}
