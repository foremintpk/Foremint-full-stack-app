'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface LlcNameContextType {
  llcNames: Record<string, string>;
  registerLlcName: (id: string, name: string) => void;
}

const LlcNameContext = createContext<LlcNameContextType | undefined>(undefined);

export function LlcNameProvider({
  children,
  initialNames,
}: {
  children: React.ReactNode;
  initialNames?: Record<string, string>;
}) {
  const [llcNames, setLlcNames] = useState<Record<string, string>>(() => {
    if (!initialNames) return {};
    return Object.fromEntries(
      Object.entries(initialNames).map(([id, name]) => [id.toLowerCase(), name])
    );
  });

  const registerLlcName = useCallback((id: string, name: string) => {
    setLlcNames((prev) => {
      const lowerId = id.toLowerCase();
      if (prev[lowerId] === name) return prev;
      return {
        ...prev,
        [lowerId]: name,
      };
    });
  }, []);

  const value = useMemo(() => ({ llcNames, registerLlcName }), [llcNames, registerLlcName]);

  return <LlcNameContext.Provider value={value}>{children}</LlcNameContext.Provider>;
}

export function useLlcNames() {
  const context = useContext(LlcNameContext);
  if (!context) {
    throw new Error('useLlcNames must be used within a LlcNameProvider');
  }
  return context;
}
