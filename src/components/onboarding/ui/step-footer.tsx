'use client';

import React, { useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';

interface StepFooterProps {
  currentStep: number;
  isSubmitting?: boolean;
  onContinue: () => void;
  continueLabel?: string;
}

export function StepFooter({ onContinue }: StepFooterProps) {
  useEffect(() => {
    const handler = () => {
      onContinue();
    };
    window.addEventListener('foremint-onboarding-continue', handler);
    return () => {
      window.removeEventListener('foremint-onboarding-continue', handler);
    };
  }, [onContinue]);

  // Return null to avoid rendering native double buttons
  return null;
}

