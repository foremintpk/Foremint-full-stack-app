'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useTransition, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { OnboardingLocalCache } from '@/types/onboarding';
import { readOnboardingCache, writeOnboardingCache, generateSessionKey } from '@/lib/onboarding-utils';
import { createClient } from '@/lib/supabase/client';

const TOTAL_STEPS = 7;

interface OnboardingState {
  tempSessionKey: string | null;
  completedSteps: number[];
  formData: Record<number, any>;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  orderSubmitStatus: 'idle' | 'submitting';
  isInitialized: boolean;
  expiresAt: string | null;
  returnToReview: boolean;
}

type OnboardingAction =
  | { type: 'INITIALIZE'; payload: OnboardingLocalCache }
  | { type: 'SET_STEP_DATA'; step: number; data: any }
  | { type: 'COMPLETE_STEP'; step: number }
  | { type: 'SET_SYNC_STATUS'; status: OnboardingState['syncStatus'] }
  | { type: 'SET_ORDER_SUBMIT_STATUS'; status: OnboardingState['orderSubmitStatus'] }
  | { type: 'SET_RETURN_TO_REVIEW'; value: boolean }
  | { type: 'LINK_USER'; userId: string }
  | { type: 'RESET' };

const initialState: OnboardingState = {
  tempSessionKey: null,
  completedSteps: [],
  formData: {},
  syncStatus: 'idle',
  orderSubmitStatus: 'idle',
  isInitialized: false,
  expiresAt: null,
  returnToReview: false,
};

function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'INITIALIZE':
      // Legacy Migration: Shift 9 steps to 8 steps
      const rawData = action.payload.form_data as Record<string, any>;
      const newFormData: Record<number, any> = {};
      const newCompletedSteps: number[] = [];

      // Copy steps 1-5 as they are
      [1, 2, 3, 4, 5].forEach(i => {
        if (rawData[i]) {
          newFormData[i] = rawData[i];
          if (i === 2) {
            newFormData[2] = {
              ...rawData[2],
              stateFee: Number(rawData[2].stateFee ?? 0),
              packagePrice: Number(rawData[2].packagePrice ?? 0),
              subtotal: Number(rawData[2].subtotal ?? 0),
            };
          }
          if (i === 5) {
            newFormData[5] = {
              ...rawData[5],
              selectedAddons: Array.isArray(rawData[5].selectedAddons) ? rawData[5].selectedAddons : [],
            };
          }
        } else if (i === 5) {
          newFormData[5] = { selectedAddons: [], addonsTotal: 0, grandTotal: 0 };
        }
        if (action.payload.completed_steps.includes(i)) newCompletedSteps.push(i);
      });

      // Handle Step 6 + 7 (Verification) merge
      const oldStep6 = rawData[6] || {};
      const oldStep7 = rawData[7] || {};
      newFormData[6] = {
        ...oldStep6,
        emailVerified: oldStep7.emailVerified || false,
        phoneVerified: oldStep7.phoneVerified || false,
        skippedPhone: oldStep7.skippedPhone || false,
      };
      if (action.payload.completed_steps.includes(6) || action.payload.completed_steps.includes(7)) {
        newCompletedSteps.push(6);
      }

      // Shift Step 8 -> 7 (Review)
      if (rawData[8]) newFormData[7] = rawData[8];
      if (action.payload.completed_steps.includes(8)) newCompletedSteps.push(7);

      // Shift Step 9 -> 8 (Payment)
      if (rawData[9]) newFormData[8] = rawData[9];
      if (action.payload.completed_steps.includes(9)) newCompletedSteps.push(8);

      return {
        ...state,
        tempSessionKey: action.payload.temp_session_key,
        completedSteps: Array.from(new Set(newCompletedSteps)),
        formData: newFormData,
        isInitialized: true,
        expiresAt: action.payload.expires_at,
      };
    case 'SET_STEP_DATA':
      return {
        ...state,
        formData: { ...state.formData, [action.step]: action.data },
      };
    case 'COMPLETE_STEP':
      const newCompleted = Array.from(new Set([...state.completedSteps, action.step]));
      return {
        ...state,
        completedSteps: newCompleted,
      };
    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncStatus: action.status,
      };
    case 'SET_ORDER_SUBMIT_STATUS':
      return {
        ...state,
        orderSubmitStatus: action.status,
      };
    case 'SET_RETURN_TO_REVIEW':
      return {
        ...state,
        returnToReview: action.value,
      };
    case 'RESET':
      return { ...initialState, isInitialized: true, tempSessionKey: generateSessionKey() };
    default:
      return state;
  }
}

const OnboardingContext = createContext<{
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  isPending: boolean;
  navigateToStep: (step: number) => void;
  showAccountPopup: boolean;
  setShowAccountPopup: (open: boolean) => void;
  completeAccountAndAdvance: () => void;
} | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const [isPending, startTransition] = useTransition();
  const [showAccountPopup, setShowAccountPopup] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse current step from URL
  const currentStepFromUrl = useMemo(() => {
    const match = pathname?.match(/\/onboarding\/step\/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }, [pathname]);

  // Initialization
  useEffect(() => {
    const cached = readOnboardingCache();
    if (cached) {
      dispatch({ type: 'INITIALIZE', payload: cached });
    } else {
      const newKey = generateSessionKey();
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const fresh: OnboardingLocalCache = {
        temp_session_key: newKey,
        current_step: 1,
        completed_steps: [],
        form_data: {},
        last_synced_at: new Date().toISOString(),
        expires_at: expiry,
      };
      writeOnboardingCache(fresh);
      dispatch({ type: 'INITIALIZE', payload: fresh });
    }

    // Mark onboarding as active for proxy logic
    if (typeof document !== 'undefined') {
      document.cookie = 'foremint_onboarding_active=true; path=/; max-age=86400; SameSite=Lax';
    }
  }, []);

  const flushSave = useCallback(async () => {
    if (!state.isInitialized || !state.tempSessionKey) return;
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    dispatch({ type: 'SET_SYNC_STATUS', status: 'saving' });
    try {
      const res = await fetch('/api/onboarding/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temp_session_key: state.tempSessionKey,
          current_step: currentStepFromUrl,
          form_data: state.formData,
          completed_steps: state.completedSteps,
        }),
      });

      if (res.ok) {
        dispatch({ type: 'SET_SYNC_STATUS', status: 'saved' });
        setTimeout(() => dispatch({ type: 'SET_SYNC_STATUS', status: 'idle' }), 3000);
      } else {
        dispatch({ type: 'SET_SYNC_STATUS', status: 'error' });
      }
    } catch {
      dispatch({ type: 'SET_SYNC_STATUS', status: 'error' });
    }
  }, [state.isInitialized, state.tempSessionKey, state.formData, state.completedSteps, currentStepFromUrl]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!state.isInitialized || !state.tempSessionKey) return;
    if (state.orderSubmitStatus === 'submitting') return;

    const cache: OnboardingLocalCache = {
      temp_session_key: state.tempSessionKey,
      current_step: currentStepFromUrl,
      completed_steps: state.completedSteps,
      form_data: state.formData,
      last_synced_at: new Date().toISOString(),
      expires_at: state.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    writeOnboardingCache(cache);

    if (typeof window !== 'undefined') {
      document.cookie = `foremint_temp_session_key=${state.tempSessionKey}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
      sessionStorage.setItem('fm_onboarding_session_key', state.tempSessionKey);
    }

    // DB Sync with debounce
    saveTimerRef.current = setTimeout(flushSave, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.formData, state.completedSteps, state.isInitialized, state.tempSessionKey, state.expiresAt, state.orderSubmitStatus, currentStepFromUrl, flushSave]);

  const navigateToStep = useCallback((step: number) => {
    startTransition(() => {
      flushSave();
      router.push(`/onboarding/step/${step}`);
    });
  }, [router, flushSave]);

  // Avoid navigateToStep here — its flushSave dependency changes after dispatch
  // and retriggers OAuth return handlers in OnboardingAccountGate.
  const completeAccountAndAdvance = useCallback(() => {
    dispatch({ type: 'COMPLETE_STEP', step: 5 });
    setShowAccountPopup(false);
    startTransition(() => {
      router.push('/onboarding/step/6');
    });
  }, [dispatch, router]);

  const value = useMemo(() => ({
    state,
    dispatch,
    isPending,
    navigateToStep,
    showAccountPopup,
    setShowAccountPopup,
    completeAccountAndAdvance,
  }), [state, isPending, navigateToStep, showAccountPopup, completeAccountAndAdvance]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingAccount() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingAccount must be used within an OnboardingProvider');
  }
  return {
    showAccountPopup: context.showAccountPopup,
    tempSessionKey: context.state.tempSessionKey,
    closeAccountPopup: () => context.setShowAccountPopup(false),
    completeAccountAndAdvance: context.completeAccountAndAdvance,
  };
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }

  const { state, dispatch, isPending, navigateToStep, setShowAccountPopup } = context;
  const pathname = usePathname();

  const currentStep = useMemo(() => {
    const match = pathname?.match(/\/onboarding\/step\/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }, [pathname]);

  const saveStepData = useCallback((step: number, data: Record<string, unknown>) => {
    dispatch({ type: 'SET_STEP_DATA', step, data });
  }, [dispatch]);

  const goToNextStep = useCallback(async () => {
    if (currentStep === 5) {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setShowAccountPopup(true);
        return;
      }

      if (state.returnToReview) {
        dispatch({ type: 'SET_RETURN_TO_REVIEW', value: false });
        navigateToStep(6);
        return;
      }

      if (state.tempSessionKey) {
        try {
          await fetch('/api/onboarding/draft/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ temp_session_key: state.tempSessionKey }),
          });
        } catch (err) {
          console.error('Failed to link draft for authenticated user:', err);
        }
      }

      dispatch({ type: 'COMPLETE_STEP', step: 5 });
      navigateToStep(6);
      return;
    }

    if (state.returnToReview) {
      dispatch({ type: 'SET_RETURN_TO_REVIEW', value: false });
      navigateToStep(6);
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      dispatch({ type: 'COMPLETE_STEP', step: currentStep });
      navigateToStep(currentStep + 1);
    }
  }, [currentStep, state.returnToReview, state.tempSessionKey, dispatch, navigateToStep, setShowAccountPopup]);

  const goToPrevStep = useCallback(() => {
    if (currentStep > 1) {
      navigateToStep(currentStep - 1);
    }
  }, [currentStep, navigateToStep]);

  const isStepComplete = useCallback((step: number) => {
    return state.completedSteps.includes(step);
  }, [state.completedSteps]);

  const isStepAccessible = useCallback((step: number) => {
    if (step === 1) return true;
    if (state.completedSteps.includes(step)) return true;
    if (state.completedSteps.includes(step - 1)) return true;
    return false;
  }, [state.completedSteps]);

  return {
    state,
    dispatch,
    currentStep,
    isPending,
    orderSubmitStatus: state.orderSubmitStatus,
    setShowAccountPopup,
    saveStepData,
    goToNextStep,
    goToPrevStep,
    navigateToStep,
    isStepComplete,
    isStepAccessible,
  };
}
