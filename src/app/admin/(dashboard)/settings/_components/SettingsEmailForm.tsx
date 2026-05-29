'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { updateAdminEmail } from '@/lib/admin/actions/settingsActions';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface SettingsEmailFormProps {
  currentEmail: string;
  userId: string;
}

export function SettingsEmailForm({ currentEmail, userId }: SettingsEmailFormProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    newEmail: '',
    confirmEmail: '',
    currentPassword: '',
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validations
    if (formData.newEmail !== formData.confirmEmail) {
      setError('New email addresses do not match.');
      return;
    }

    if (formData.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError('New email must be different from your current email.');
      return;
    }

    startTransition(async () => {
      const data = new FormData();
      data.append('newEmail', formData.newEmail);
      data.append('confirmEmail', formData.confirmEmail);
      data.append('currentPassword', formData.currentPassword);

      const res = await updateAdminEmail(data);

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.requiresReLogin) {
        setSuccess('Email updated. You will be signed out now.');

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
        <h3 className="text-lg font-semibold font-manrope text-gray-900">Update Email</h3>
        <p className="text-xs text-gray-500 font-inter">
          Changing your email will sign you out of all devices.
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

        {/* New Email */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 font-inter block">
            New Email
          </label>
          <input
            type="email"
            name="newEmail"
            required
            placeholder={currentEmail}
            value={formData.newEmail}
            onChange={handleChange}
            disabled={isPending || !!success}
            className="w-full h-10 px-4 text-sm rounded-full border border-[#e0d9f7] text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#34088f] focus:ring-4 focus:ring-[#34088f]/10 disabled:opacity-60 transition font-inter"
          />
        </div>

        {/* Confirm New Email */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 font-inter block">
            Confirm New Email
          </label>
          <input
            type="email"
            name="confirmEmail"
            required
            placeholder="Confirm new email address"
            value={formData.confirmEmail}
            onChange={handleChange}
            disabled={isPending || !!success}
            className="w-full h-10 px-4 text-sm rounded-full border border-[#e0d9f7] text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#34088f] focus:ring-4 focus:ring-[#34088f]/10 disabled:opacity-60 transition font-inter"
          />
        </div>

        {/* Current Password */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 font-inter block">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="currentPassword"
              required
              placeholder="••••••••"
              value={formData.currentPassword}
              onChange={handleChange}
              disabled={isPending || !!success}
              className="w-full h-10 pl-4 pr-10 text-sm rounded-full border border-[#e0d9f7] text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-[#34088f] focus:ring-4 focus:ring-[#34088f]/10 disabled:opacity-60 transition font-inter"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending || !!success}
            className="inline-flex items-center justify-center gap-2 h-10 px-6 text-sm font-semibold rounded-full bg-[#34088f] hover:bg-[#25036b] active:scale-[0.98] text-white disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none transition duration-150 font-inter shadow-[0_1px_4px_rgba(52,8,143,0.15)]"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating...
              </>
            ) : (
              'Update Email'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SettingsEmailForm;
