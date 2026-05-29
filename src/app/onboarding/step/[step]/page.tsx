import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { OnboardingAccountGate } from '../../_components/OnboardingAccountGate';

const StepPlaceholder = dynamic(() => import('@/components/onboarding/step-placeholder').then(mod => mod.StepPlaceholder));

const stepLoading = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <Loader2 className="w-8 h-8 text-[#34088f] animate-spin" />
  </div>
);

const Step1 = dynamic(() => import('@/components/onboarding/steps/step-1'), { loading: stepLoading });
const Step2 = dynamic(() => import('@/components/onboarding/steps/step-2'), { loading: stepLoading });
const Step3 = dynamic(() => import('@/components/onboarding/steps/step-3'), { loading: stepLoading });
const Step4 = dynamic(() => import('@/components/onboarding/steps/step-4'), { loading: stepLoading });
const Step5 = dynamic(() => import('@/components/onboarding/steps/step-5'), { loading: stepLoading });
const Step6 = dynamic(() => import('@/components/onboarding/steps/step-6'), { loading: stepLoading });
const Step7 = dynamic(() => import('@/components/onboarding/steps/step-7'), { loading: stepLoading });

const STEP_COMPONENTS: Record<number, React.ComponentType<{ stepNumber: number }>> = {
  1: Step1 as React.ComponentType<{ stepNumber: number }>,
  2: Step2 as React.ComponentType<{ stepNumber: number }>,
  3: Step3 as React.ComponentType<{ stepNumber: number }>,
  4: Step4 as React.ComponentType<{ stepNumber: number }>,
  5: Step5 as React.ComponentType<{ stepNumber: number }>,
  6: Step6 as React.ComponentType<{ stepNumber: number }>,
  7: Step7 as React.ComponentType<{ stepNumber: number }>,
};

export default async function OnboardingStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const stepNumber = parseInt(step, 10);

  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 7) {
    redirect('/onboarding/step/1');
  }

  if (stepNumber === 8) {
    redirect('/onboarding/step/7');
  }

  const StepComponent = STEP_COMPONENTS[stepNumber] || StepPlaceholder;

  return (
    <div className="w-full">
      <Suspense fallback={null}>
        <OnboardingAccountGate />
      </Suspense>
      <StepComponent stepNumber={stepNumber} />
    </div>
  );
}
