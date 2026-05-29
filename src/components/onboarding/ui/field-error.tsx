import React from 'react';

interface FieldErrorProps {
  error?: string;
}

export function FieldError({ error }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p className="mt-1 text-[12px] font-bold text-[#EF4444] font-inter animate-in fade-in slide-in-from-top-1">
      {error}
    </p>
  );
}
