'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { updateAdminPassword } from '@/lib/admin/actions/settingsActions';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface SettingsPasswordFormProps {
  userId: string;
}

export function SettingsPasswordForm({ userId }: SettingsPasswordFormProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Field states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    if (!password) return { label: '', colorClass: 'bg-gray-100', width: '0%', textClass: 'text-gray-400' };
    if (password.length < 8) {
      return {
        label: 'Weak (min. 8 characters)',
        colorClass: 'bg-red-500',
        width: '33.33%',
        textClass: 'text-red-500',
      };
    }
    
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password);

    if (hasNumber && hasSpecial) {
      return {
        label: 'Strong',
        colorClass: 'bg-emerald-500',
        width: '100%',
        textClass: 'text-emerald-600',
      };
    }

    return {
      label: 'Fair (add numbers & special chars for a strong password)',
      colorClass: 'bg-amber-500',
      width: '66.66%',
      textClass: 'text-amber-500',
    };
  };

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client validations
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      data.append('currentPassword', currentPassword);
      data.append('newPassword', newPassword);
      data.append('confirmPassword', confirmPassword);

      const res = await updateAdminPassword(data);

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.requiresReLogin) {
        setSuccess('Password updated. Signing you out...');

        // Wait 2 seconds then clear the local session and redirect.
        // The server already revoked all sessions via the Admin API, so
        // signOut() may encounter an invalid token — we catch that silently.
        setTimeout(async () => {
          try {
            await supabase.auth.signOut();
          } catch {
            // Session already invalidated server-side — ignore.
          }
          router.push('/sign-in');
        }, 2000);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-[#e0d9f7] bg-white p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)]">
      <div className="mb-5">
        <h3 className="text-lg font-semibold font-manrope text-gray-900">Update Password</h3>
        <p className="text-xs text-gray-500 font-inter">
          After changing your password, you will be signed out of all devices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl font-inter">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl font-inter">
            {success}
          </div>
        )}

        {/* Current Password */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 font-inter block">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isPending || !!success}
              className="w-full h-10 pl-4 pr-10 text-sm rounded-full border border-[#e0d9f7] text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#34088f] focus:ring-4 focus:ring-[#34088f]/10 disabled:opacity-60 transition font-inter"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 font-inter block">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isPending || !!success}
              className="w-full h-10 pl-4 pr-10 text-sm rounded-full border border-[#e0d9f7] text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#34088f] focus:ring-4 focus:ring-[#34088f]/10 disabled:opacity-60 transition font-inter"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength Indicator */}
          {newPassword && (
            <div className="space-y-1.5 pt-1">
              <div className="rounded-full h-1.5 bg-gray-100 overflow-hidden">
                <div
                  className={`h-full ${strength.colorClass} transition-all duration-300 ease-out`}
                  style={{ width: strength.width }}
                />
              </div>
              <p className={`text-[10px] font-semibold font-inter ${strength.textClass}`}>
                Strength: {strength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm New Password */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 font-inter block">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isPending || !!success}
              className={`w-full h-10 pl-4 pr-10 text-sm rounded-full border text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-4 disabled:opacity-60 transition font-inter ${
                passwordsMatch
                  ? 'border-[#e0d9f7] focus:border-[#34088f] focus:ring-[#34088f]/10'
                  : 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {!passwordsMatch && (
            <p className="text-[10px] font-semibold text-red-500 font-inter pt-0.5">
              Passwords do not match
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending || !passwordsMatch || !!success}
            className="inline-flex items-center justify-center gap-2 h-10 px-6 text-sm font-semibold rounded-full bg-[#34088f] hover:bg-[#25036b] active:scale-[0.98] text-white disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none transition duration-150 font-inter shadow-[0_1px_4px_rgba(52,8,143,0.15)]"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SettingsPasswordForm;
