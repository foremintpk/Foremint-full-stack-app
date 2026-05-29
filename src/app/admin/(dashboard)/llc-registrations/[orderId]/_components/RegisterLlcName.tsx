'use client';

import { useEffect } from 'react';
import { useLlcNames } from '@/context/llc-name-context';

interface RegisterLlcNameProps {
  id: string;
  name: string;
}

export function RegisterLlcName({ id, name }: RegisterLlcNameProps) {
  const { registerLlcName } = useLlcNames();

  useEffect(() => {
    if (id && name) {
      registerLlcName(id, name);
    }
  }, [id, name, registerLlcName]);

  return null;
}
