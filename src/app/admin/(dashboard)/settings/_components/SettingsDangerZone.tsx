'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { forceLogoutAllSessions } from '@/lib/admin/actions/settingsActions';
import { SettingsLogoutConfirm } from './SettingsLogoutConfirm';

export function SettingsDangerZone(): React.JSX.Element {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await forceLogoutAllSessions();
      if (res.error) {
        setError(res.error);
        setIsOpen(false);
        return;
      }

      // Server has already revoked all sessions. Clear local state and redirect.
      // signOut() may encounter an invalid token since sessions are already gone —
      // we catch that silently and still proceed to the sign-in page.
      try {
        await supabase.auth.signOut();
      } catch {
        // Session already invalidated server-side — ignore.
      }
      router.push('/sign-in');
    });
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/20 p-6 shadow-[0_1px_4px_rgba(220,38,38,0.02)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold font-manrope text-red-700">Danger Zone</h3>
          <p className="text-xs text-red-600 font-inter">
            These actions affect your current session and all connected devices.
          </p>
        </div>
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-full border border-red-300 text-red-600 hover:bg-red-50 active:scale-[0.98] px-5 py-2 text-sm font-semibold transition font-inter shadow-sm"
          >
            Sign Out All Devices
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded-xl font-inter">
          Error signing out: {error}
        </div>
      )}

      <SettingsLogoutConfirm
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        isConfirming={isPending}
      />
    </div>
  );
}

export default SettingsDangerZone;
