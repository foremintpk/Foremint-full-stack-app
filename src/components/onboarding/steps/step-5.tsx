'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useOnboarding } from '@/context/onboarding-context';
import { StepFooter } from '../ui/step-footer';
import { AddonsStep } from '@/app/onboarding/_components/steps/AddonsStep';
import { mergeFormDataFromSteps } from '@/lib/onboarding/mergeFormData';
import type { OnboardingFormData, PublicAddon, PublicAddonCategory } from '@/types/onboarding';

interface ApiAddon {
  id: string;
  name: string;
  price: number;
  features?: string[];
  categories?: Array<{ id: string; name: string }>;
}

interface ApiCategory {
  id: string;
  name: string;
}

export default function Step5() {
  const { state, saveStepData, goToNextStep } = useOnboarding();
  const initialData = useMemo(
    () => mergeFormDataFromSteps(state.formData as Record<number, unknown>),
    [state.formData]
  );
  const [formData, setFormData] = useState<OnboardingFormData>(initialData);
  const [addons, setAddons] = useState<PublicAddon[]>([]);
  const [categories, setCategories] = useState<PublicAddonCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAddons() {
      try {
        const res = await fetch('/api/onboarding/addons');
        if (!res.ok) throw new Error('Failed to fetch addons');
        const json = await res.json();
        const mappedAddons: PublicAddon[] = ((json.addons || []) as ApiAddon[]).map(addon => {
          const addonCategories = addon.categories ?? [];
          return {
            id: addon.id,
            name: addon.name,
            price: Number(addon.price),
            features: Array.isArray(addon.features) ? addon.features : [],
            categoryIds: addonCategories.map(cat => cat.id),
            categoryNames: addonCategories.map(cat => cat.name),
          };
        });
        const mappedCategories: PublicAddonCategory[] = ((json.categories || []) as ApiCategory[]).map(cat => ({
          id: cat.id,
          name: cat.name,
        }));
        setAddons(mappedAddons);
        setCategories(mappedCategories);
      } catch (err) {
        console.error('Error loading addons:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAddons();
  }, []);

  const handleChange = useCallback((updates: Partial<OnboardingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleContinue = async () => {
    saveStepData(5, {
      selectedAddons: formData.selectedAddons ?? [],
      addonTotal: formData.addonTotal ?? 0,
      addonsTotal: formData.addonTotal ?? 0,
      grandTotal: formData.stateFee + formData.packagePrice + (formData.addonTotal ?? 0),
    });
    goToNextStep();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-7 h-7 text-[#34088f] animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading optional services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AddonsStep
        formData={formData}
        onChange={handleChange}
        addons={addons}
        categories={categories}
      />

      <StepFooter
        currentStep={5}
        onContinue={handleContinue}
      />
    </div>
  );
}
