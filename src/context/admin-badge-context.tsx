'use client';

import { createContext, useContext } from 'react';

interface AdminBadgeContextType {
  decrementLlcOrderBadge: () => void;
}

export const AdminBadgeContext = createContext<AdminBadgeContextType>({
  decrementLlcOrderBadge: () => {},
});

export function useAdminBadge(): AdminBadgeContextType {
  return useContext(AdminBadgeContext);
}
