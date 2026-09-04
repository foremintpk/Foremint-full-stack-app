import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentAdminProfile } from '@/lib/admin/getCurrentAdminProfile';
import { SettingsProfileCard } from './_components/SettingsProfileCard';
import { SettingsEmailForm } from './_components/SettingsEmailForm';
import { SettingsPasswordForm } from './_components/SettingsPasswordForm';
import { SettingsDangerZone } from './_components/SettingsDangerZone';
import { SettingsApiKeyForm } from './_components/SettingsApiKeyForm';
import { getSs4Settings, toPublicSettings } from '@/lib/services/ss4/settings';
import { ShieldAlert } from 'lucide-react';
import { isStaffRole } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const profile = await getCurrentAdminProfile();

  // If not authenticated, bounce to sign-in
  if (!profile) {
    redirect('/sign-in?redirect=/admin/settings' as any);
  }

  // Access control check: Only "administrator" role is allowed
  // Every staff role reaches this page: it is entirely self-service — own
  // profile, own email, own password, and signing out of all sessions. Nothing
  // here touches another user or any system-wide setting.
  if (!isStaffRole(profile.role)) {
    return (
      <div className="flex items-center justify-center py-12 px-4 font-inter">
        <div className="w-full max-w-md p-8 bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)] text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 text-red-600 rounded-full border border-red-100">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-manrope text-gray-900">Access Denied</h2>
            <p className="text-sm text-gray-500 font-inter leading-relaxed">
              Settings are restricted to staff accounts. Your current account has the role of{' '}
              <span className="font-semibold text-gray-700 capitalize select-text">{profile.role}</span>.
            </p>
          </div>
          <div className="pt-2 text-xs text-gray-400 font-inter">
            Please contact a primary system administrator if you believe this is an error.
          </div>
        </div>
      </div>
    );
  }

  // The API key is system-wide, so only administrators see or change it — the
  // rest of this page is self-service and open to every staff role.
  const isAdministrator = profile.role === 'administrator';
  const ss4 = isAdministrator ? toPublicSettings(await getSs4Settings()) : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-12 select-text font-inter">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 font-manrope">
          Settings
        </h1>
        <p className="text-xs font-semibold text-gray-500 font-inter">
          Manage your account credentials, sessions and integration keys.
        </p>
      </div>

      {/* Read-only profile card */}
      <SettingsProfileCard profile={profile} />

      {/* Email form */}
      <SettingsEmailForm currentEmail={profile.email} userId={profile.id} />

      {/* Password form */}
      <SettingsPasswordForm userId={profile.id} />

      {/* Document-reading API key — administrators only */}
      {ss4 && (
        <SettingsApiKeyForm
          hasKey={ss4.hasVisionKey}
          keyHint={ss4.visionKeyHint}
          model={ss4.visionModel}
        />
      )}

      {/* Danger Zone */}
      <SettingsDangerZone />
    </div>
  );
}
