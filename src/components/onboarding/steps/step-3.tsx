'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { StepFooter } from '../ui/step-footer';
import { FieldError } from '../ui/field-error';
import { BusinessInformationStep } from '@/app/onboarding/_components/steps/BusinessInformationStep';
import type { OnboardingFormData } from '@/types/onboarding';
import { toast } from 'sonner';

function validateBusinessInformation(formData: Partial<OnboardingFormData>): { message: string; field: keyof OnboardingFormData } | null {
  if (!formData.businessName?.trim()) return { message: 'Business Name is required', field: 'businessName' }
  if (!formData.businessCategory?.trim()) return { message: 'Business Category is required', field: 'businessCategory' }
  if (!formData.businessDescription?.trim()) return { message: 'Business Description is required', field: 'businessDescription' }
  return null
}

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

export default function Step3() {
  const { state, saveStepData, goToNextStep } = useOnboarding();

  const [formData, setFormData] = useState<OnboardingFormData>(() =>
    buildFormData({ ...state.formData[1], ...state.formData[2], ...state.formData[3] })
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<Partial<Record<keyof OnboardingFormData, boolean>>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Debounced auto-save ref
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const handleChange = useCallback((updates: Partial<OnboardingFormData>) => {
    setFormData(prev => {
      const next = { ...prev, ...updates };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveStepData(3, {
          businessName: next.businessName,
          secondaryBusinessName: next.secondaryBusinessName,
          businessWebsite: next.businessWebsite,
          businessCategory: next.businessCategory,
          businessDescription: next.businessDescription,
        });
      }, 600);
      return next;
    });
    setValidationError(null);
    setInvalidFields(prev => {
      const next = { ...prev };
      Object.keys(updates).forEach(key => delete next[key as keyof OnboardingFormData]);
      return next;
    });
  }, [saveStepData]);

  const handleContinue = () => {
    setIsValidating(true);
    const error = validateBusinessInformation(formData);
    if (error) {
      setValidationError(error.message);
      setInvalidFields({ [error.field]: true });
      toast.error(error.message);
      setIsValidating(false);
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveStepData(3, {
      businessName: formData.businessName,
      secondaryBusinessName: formData.secondaryBusinessName,
      businessWebsite: formData.businessWebsite,
      businessCategory: formData.businessCategory,
      businessDescription: formData.businessDescription,
    });
    goToNextStep();
  };

  return (
    <div className="space-y-8">
      <BusinessInformationStep formData={formData} onChange={handleChange} invalidFields={invalidFields} />

      {validationError && (
        <div className="max-w-xl">
          <FieldError error={validationError} />
        </div>
      )}

      <StepFooter
        currentStep={3}
        isSubmitting={isValidating}
        onContinue={handleContinue}
      />
    </div>
  );
}
