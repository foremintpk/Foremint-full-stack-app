'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FieldError } from './field-error';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  error?: string;
  required?: boolean;
  textarea?: boolean;
  charLimit?: number;
  currentChars?: number;
}

export function FormInput({
  label,
  error,
  required,
  textarea,
  charLimit,
  currentChars,
  className,
  id,
  ...props
}: FormInputProps) {
  const InputComponent = textarea ? 'textarea' : 'input';

  return (
    <div className="space-y-1.5 group">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-[13px] font-bold text-gray-700 font-inter"
        >
          {label}
          {required && <span className="text-[#34088f] ml-1">*</span>}
          {!required && <span className="text-gray-400 font-medium ml-1">(optional)</span>}
        </label>
        
        {charLimit && currentChars !== undefined && (
          <span className={cn(
            "text-[11px] font-bold font-inter",
            currentChars > charLimit ? "text-[#EF4444]" : "text-gray-400"
          )}>
            {currentChars} / {charLimit}
          </span>
        )}
      </div>

      <div className="relative">
        <InputComponent
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "w-full bg-white border border-gray-200 px-4 py-3 text-[14px] font-medium text-black placeholder:text-gray-400 transition-all duration-200 outline-none rounded-sm",
            "focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/10",
            textarea ? "min-height-[120px] resize-none" : "h-[48px]",
            error ? "border-[#EF4444] focus:ring-[#EF4444]/10" : "",
            className
          )}
          {...(props as any)}
        />
      </div>

      <FieldError error={error} />
    </div>
  );
}
