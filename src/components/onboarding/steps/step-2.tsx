'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { StepFooter } from '../ui/step-footer';
import { FieldError } from '../ui/field-error';
import { FormationStep } from '@/app/onboarding/_components/steps/FormationStep';
import type { OnboardingFormData, PublicPackage } from '@/types/onboarding';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function validateFormation(formData: Partial<OnboardingFormData>): { message: string; field: 'formationState' | 'selectedPackageId' } | null {
  if (!formData.formationState) return { message: 'State selection is required', field: 'formationState' }
  if (!formData.selectedPackageId) return { message: 'Package selection is required', field: 'selectedPackageId' }
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

export default function Step2() {
  const { state, saveStepData, goToNextStep } = useOnboarding();

  // Merge step 1 and step 2 data into unified formData
  const [formData, setFormData] = useState<OnboardingFormData>(() =>
    buildFormData({ ...state.formData[1], ...state.formData[2] })
  );
  const [packages, setPackages] = useState<PublicPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<{ formationState?: boolean; selectedPackageId?: boolean }>({});
  const [isValidating, setIsValidating] = useState(false);

  // Debounced auto-save ref
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch packages from existing API route
  useEffect(() => {
    async function fetchPackages() {
      try {
        const res = await fetch('/api/onboarding/packages');
        if (!res.ok) throw new Error('Failed to fetch packages');
        const json = await res.json();
        const mapped: PublicPackage[] = (json.packages || []).map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          price: Number(pkg.price),
          features: Array.isArray(pkg.features) ? pkg.features : [],
          sortOrder: pkg.sortOrder ?? 0,
        }));
        setPackages(mapped);
      } catch (err) {
        console.error('Error loading packages:', err);
      } finally {
        setIsLoadingPackages(false);
      }
    }
    fetchPackages();
  }, []);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const handleChange = useCallback((updates: Partial<OnboardingFormData>) => {
    setFormData(prev => {
      const next = { ...prev, ...updates };
      // Debounce save: 600ms
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        // Save step 2 data back (only the formation fields)
        saveStepData(2, {
          formationState: next.formationState,
          formationStateName: next.formationStateName,
          stateFee: next.stateFee,
          selectedPackageId: next.selectedPackageId,
          selectedPackageName: next.selectedPackageName,
          packagePrice: next.packagePrice,
        });
      }, 600);
      return next;
    });
    setValidationError(null);
    setInvalidFields(prev => ({ ...prev, ...Object.fromEntries(Object.keys(updates).map(key => [key, false])) }));
  }, [saveStepData]);

  const handleContinue = () => {
    setIsValidating(true);
    const error = validateFormation(formData);
    if (error) {
      setValidationError(error.message);
      setInvalidFields({ [error.field]: true });
      toast.error(error.message);
      setIsValidating(false);
      return;
    }
    // Flush save immediately
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveStepData(2, {
      formationState: formData.formationState,
      formationStateName: formData.formationStateName,
      stateFee: formData.stateFee,
      selectedPackageId: formData.selectedPackageId,
      selectedPackageName: formData.selectedPackageName,
      packagePrice: formData.packagePrice,
    });
    goToNextStep();
  };

  if (isLoadingPackages) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-7 h-7 text-[#34088f] animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading formation packages…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FormationStep
        formData={formData}
        onChange={handleChange}
        packages={packages}
        invalidFields={invalidFields}
      />

      {validationError && (
        <div className="max-w-2xl">
          <FieldError error={validationError} />
        </div>
      )}

      <StepFooter
        currentStep={2}
        isSubmitting={isValidating}
        onContinue={handleContinue}
      />
    </div>
  );
}
