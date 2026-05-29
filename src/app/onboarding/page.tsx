'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clearOnboardingArtifacts, readOnboardingCache } from '@/lib/onboarding-utils';
import { Loader2 } from 'lucide-react';

export default function OnboardingEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const cached = readOnboardingCache();

    const startFresh = () => {
      clearOnboardingArtifacts();
      router.replace('/onboarding/step/1');
    };

    if (!cached) {
      startFresh();
      return;
    }

    void (async () => {
      try {
        const res = await fetch(
          `/api/onboarding/draft?key=${encodeURIComponent(cached.temp_session_key)}`
        );
        const data = (await res.json()) as { draft?: { status?: string } };

        if (data.draft?.status === 'completed') {
          startFresh();
          return;
        }

        const lastCompleted = cached.completed_steps.length > 0
          ? Math.max(...cached.completed_steps)
          : 0;
        const nextStep = Math.min(lastCompleted + 1, 7);
        router.replace(`/onboarding/step/${nextStep}`);
      } catch {
        const lastCompleted = cached.completed_steps.length > 0
          ? Math.max(...cached.completed_steps)
          : 0;
        const nextStep = Math.min(lastCompleted + 1, 7);
        router.replace(`/onboarding/step/${nextStep}`);
      }
    })();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Loader2 className="w-8 h-8 text-[#34088f] animate-spin" />
      <p className="text-[12px] font-black uppercase tracking-widest text-gray-400 font-manrope">Initializing Experience...</p>
    </div>
  );
}
