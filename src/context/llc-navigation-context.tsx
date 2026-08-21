'use client';

import React, {
  createContext,
  useContext,
  useState,
  useTransition,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';

/** Typed-routes href accepted by the app router; our URLs are built at runtime. */
type RouterHref = Parameters<ReturnType<typeof useRouter>['push']>[0];

interface NavigateOptions {
  /**
   * Background navigations (the debounced search) never block the UI: no
   * loading overlay, no disabled controls, and they `replace` instead of
   * `push` so typing a word does not stack one history entry per keystroke.
   */
  background?: boolean;
}

interface LlcNavigationContextType {
  /** True only for blocking navigations — status pills, date, sort, page size, pagination. */
  isPending: boolean;
  /** True only while a background search navigation is in flight. */
  isSearching: boolean;
  navigate: (url: string, options?: NavigateOptions) => void;
}

const LlcNavigationContext = createContext<LlcNavigationContextType>({
  isPending: false,
  isSearching: false,
  navigate: () => {},
});

export function useLlcNavigation(): LlcNavigationContextType {
  return useContext(LlcNavigationContext);
}

export function LlcNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isTransitioning, startTransition] = useTransition();
  const [isBackground, setIsBackground] = useState(false);

  const navigate = useCallback(
    (url: string, options?: NavigateOptions) => {
      const background = options?.background ?? false;
      setIsBackground(background);
      startTransition(() => {
        if (background) {
          // scroll:false keeps the list from jumping to the top on every keystroke
          router.replace(url as RouterHref, { scroll: false });
        } else {
          router.push(url as RouterHref);
        }
      });
    },
    [router]
  );

  return (
    <LlcNavigationContext.Provider
      value={{
        isPending: isTransitioning && !isBackground,
        isSearching: isTransitioning && isBackground,
        navigate,
      }}
    >
      {children}
    </LlcNavigationContext.Provider>
  );
}
