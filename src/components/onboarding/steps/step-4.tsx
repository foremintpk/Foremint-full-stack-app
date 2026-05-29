'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { StepFooter } from '../ui/step-footer';
import { FieldError } from '../ui/field-error';
import { MembersStep } from '@/app/onboarding/_components/steps/MembersStep';
import { mergeFormDataFromSteps } from '@/lib/onboarding/mergeFormData';
import type { OnboardingFormData, OnboardingMember } from '@/types/onboarding';
import { toast } from 'sonner';

function validateMembers(formData: OnboardingFormData): string | null {
  const members = formData.members ?? [];
  if (formData.memberType === 'multi-member' && members.length < 2) {
    return 'At least 2 members are required for a Multi Member LLC.';
  }
  if (members.length < 1) return 'At least one member is required.';

  const incompleteIndex = members.findIndex(member =>
    !member.fullName.trim() || !member.addressLine1.trim()
  );
  if (incompleteIndex >= 0) {
    return `Please complete the required fields for Member ${incompleteIndex + 1}.`;
  }
  return null;
}

export default function Step4() {
  const { state, saveStepData, goToNextStep } = useOnboarding();
  const initialData = useMemo(
    () => mergeFormDataFromSteps(state.formData as Record<number, unknown>),
    [state.formData]
  );
  const [formData, setFormData] = useState<OnboardingFormData>(initialData);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleChange = useCallback((updates: Partial<OnboardingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setValidationError(null);
  }, []);

  const handleContinue = () => {
    setIsValidating(true);
    const error = validateMembers(formData);
    if (error) {
      setValidationError(error);
      toast.error(error);
      setIsValidating(false);
      return;
    }

    const membersToSave = (formData.members ?? []).map((member: OnboardingMember) => ({
      ...member,
      ssnItin: member.ssnItin ?? '',
    }));

    saveStepData(4, { members: membersToSave });
    goToNextStep();
  };

  return (
    <div className="space-y-8">
      <MembersStep formData={formData} onChange={handleChange} />

      {validationError && (
        <div className="max-w-2xl">
          <FieldError error={validationError} />
        </div>
      )}

      <StepFooter
        currentStep={4}
        isSubmitting={isValidating}
        onContinue={handleContinue}
      />
    </div>
  );
}
