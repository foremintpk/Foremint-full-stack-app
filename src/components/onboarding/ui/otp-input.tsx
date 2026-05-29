'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  error?: string;
  disabled?: boolean;
}

export function OtpInput({ length = 6, onComplete, error, disabled }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    const combined = newOtp.join('');
    if (combined.length === length) {
      onComplete(combined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').slice(0, length);
    if (isNaN(Number(data))) return;

    const newOtp = [...otp];
    data.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);

    if (data.length === length) {
      onComplete(data);
    } else if (inputRefs.current[data.length]) {
      inputRefs.current[data.length]?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={disabled}
            className={cn(
              "w-[48px] h-[56px] text-center text-[24px] font-black font-manrope border bg-white transition-all outline-none rounded-sm",
              error ? "border-[#EF4444] text-[#EF4444]" : "border-gray-200 focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/10 text-black",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            autoComplete="one-time-code"
          />
        ))}
      </div>
      {error && <p className="text-[12px] font-bold text-[#EF4444] font-inter">{error}</p>}
    </div>
  );
}
