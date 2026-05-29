import React from 'react';
import { OnboardingProvider } from '@/context/onboarding-context';
import { OnboardingShell } from './_components/OnboardingShell';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <OnboardingShell>{children}</OnboardingShell>
    </OnboardingProvider>
  );
}
