import { OnboardingLocalCache } from '@/types/onboarding';

const STORAGE_KEY = 'foremint_onboarding';

// Generate a new temp session key
export function generateSessionKey(): string {
  return crypto.randomUUID();
}

// Read onboarding cache from localStorage (returns null if missing/expired)
export function readOnboardingCache(): OnboardingLocalCache | null {
  if (typeof window === 'undefined') return null;
  
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as OnboardingLocalCache;
    
    // Check expiry
    if (new Date(data.expires_at) < new Date()) {
      clearOnboardingCache();
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

// Write onboarding cache to localStorage
export function writeOnboardingCache(data: OnboardingLocalCache): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Clear onboarding cache (post-submission or expiry)
export function clearOnboardingCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// Clear all browser-side onboarding markers so a completed order does not
// resurrect the previous draft on the next visit.
export function clearOnboardingArtifacts(): void {
  if (typeof window === 'undefined') return;

  clearOnboardingCache();
  sessionStorage.removeItem('fm_onboarding_session_key');
  document.cookie = 'foremint_temp_session_key=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'foremint_onboarding_active=; path=/; max-age=0; SameSite=Lax';
}

// Calculate progress percentage
export function calculateProgress(completedSteps: number[]): number {
  return Math.round((completedSteps.length / 9) * 100);
}

// Check if a step is accessible (completed or immediately next)
export function isStepAccessible(step: number, completedSteps: number[]): boolean {
  if (step === 1) return true;
  // If the step itself is in completedSteps, it's accessible (back-edit)
  if (completedSteps.includes(step)) return true;
  // If the previous step is completed, this step is the current "next" step
  if (completedSteps.includes(step - 1)) return true;
  
  // Special case: if step 1 is not in completedSteps but we are asking for step 1, 
  // it's handled above. If we are asking for step 2 and step 1 is not completed, return false.
  return false;
}
