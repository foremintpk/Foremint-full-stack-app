'use client';

import React, {
  createContext,
  useContext,
  useState,
  useTransition,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';

interface LlcNavigationContextType {
  isPending: boolean;
  navigate: (url: string) => void;
}

const LlcNavigationContext = createContext<LlcNavigationContextType>({
  isPending: false,
  navigate: () => {},
});

export function useLlcNavigation(): LlcNavigationContextType {
  return useContext(LlcNavigationContext);
}

export function LlcNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (url: string) => {
      startTransition(() => {
        router.push(url as any);
      });
    },
    [router]
  );

  return (
    <LlcNavigationContext.Provider value={{ isPending, navigate }}>
      {children}
    </LlcNavigationContext.Provider>
  );
}
