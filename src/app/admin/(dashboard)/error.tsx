/**
 * @file src/app/admin/(dashboard)/error.tsx
 * @description Highly aesthetic error boundary screen allowing immediate diagnostic feedback and recovery options.
 * 
 * 1. Server vs Client choice rationale: Client Component ("use client"). Required by Next.js error boundary conventions.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error captured by Admin Dashboard Error Boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-500 mb-6">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-bold text-black mb-2 font-manrope">
        Something went wrong
      </h1>
      
      <p className="text-sm text-gray-500 max-w-md mb-8 font-inter">
        An unexpected error occurred while loading this dashboard panel. Please verify your internet connection or reload the page.
      </p>

      {error.digest && (
        <code className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-[0.125rem] font-mono mb-8 block">
          Digest ID: {error.digest}
        </code>
      )}

      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-[#34088f] hover:bg-[#2a0673] text-white text-sm font-medium rounded-[0.125rem] transition-colors flex items-center gap-2 font-inter shadow-sm"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Try again</span>
      </button>
    </div>
  );
}
