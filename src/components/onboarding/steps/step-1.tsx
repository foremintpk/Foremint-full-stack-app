'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { StepFooter } from '../ui/step-footer';
import { FieldError } from '../ui/field-error';
import { EntityTypeStep } from '@/app/onboarding/_components/steps/EntityTypeStep';
import type { OnboardingFormData } from '@/types/onboarding';
import { toast } from 'sonner';

function validateEntityType(formData: Partial<OnboardingFormData>): string | null {
  if (!formData.entityType) return 'Please select an entity type.'
  if (formData.entityType === 'us-llc' && !formData.memberType)
    return 'Please select Single Member or Multi Member LLC.'
  return null
}

// Build a fresh OnboardingFormData shell from whatever is stored in context
function buildFormData(raw: Record<string, unknown>): OnboardingFormData {
  return {
    entityType: (raw.entityType as OnboardingFormData['entityType']) ?? null,
    memberType: (raw.memberType as OnboardingFormData['memberType']) ?? null,
    formationState: (raw.formationState as string) ?? null,
    formationStateName: (raw.formationStateName as string) ?? null,
    stateFee: Number(raw.stateFee ?? 0),
    selectedPackageId: (raw.selectedPackageId as string) ?? null,
    selectedPackageName: (raw.selectedPackageName as string) ?? null,
    packagePrice: Number(raw.packagePrice ?? 0),
    businessName: (raw.businessName as string) ?? '',
    secondaryBusinessName: (raw.secondaryBusinessName as string) ?? '',
    businessWebsite: (raw.businessWebsite as string) ?? '',
    businessCategory: (raw.businessCategory as string) ?? '',
    businessDescription: (raw.businessDescription as string) ?? '',
  }
}

export default function Step1() {
  const { state, saveStepData, goToNextStep } = useOnboarding();

  // Merge Chunk 2 formData shape over any existing step-1 data
  const [formData, setFormData] = useState<OnboardingFormData>(() =>
    buildFormData(state.formData[1] || {})
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Debounced auto-save ref
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const handleChange = useCallback((updates: Partial<OnboardingFormData>) => {
    setFormData(prev => {
      const next = { ...prev, ...updates };
      // Debounce save: 600ms
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveStepData(1, {
          entityType: next.entityType,
          memberType: next.memberType,
        });
      }, 600);
      return next;
    });
    setValidationError(null);
  }, [saveStepData]);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const handleContinue = () => {
    setIsValidating(true);
    const error = validateEntityType(formData);
    if (error) {
      setValidationError(error);
      toast.error(error);
      setIsValidating(false);
      return;
    }
    // Flush save immediately before navigation
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveStepData(1, {
      entityType: formData.entityType,
      memberType: formData.memberType,
    });
    goToNextStep();
  };

  return (
    <div className="space-y-8">
      <EntityTypeStep formData={formData} onChange={handleChange} />

      {validationError && (
        <div className="max-w-xl">
          <FieldError error={validationError} />
        </div>
      )}

      <StepFooter
        currentStep={1}
        isSubmitting={isValidating}
        onContinue={handleContinue}
      />
    </div>
  );
}
