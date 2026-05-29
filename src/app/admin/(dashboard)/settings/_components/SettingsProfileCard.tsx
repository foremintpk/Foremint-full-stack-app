import React from 'react';
import { AdminProfile } from '@/types/admin';
import { UserRoleBadge } from '@/app/admin/(dashboard)/users/_components/UserRoleBadge';

interface SettingsProfileCardProps {
  profile: AdminProfile;
}

export function SettingsProfileCard({ profile }: SettingsProfileCardProps): React.JSX.Element {
  // Compute initials for the fallback avatar
  const getInitials = (name: string | null, email: string) => {
    if (!name) return email.charAt(0).toUpperCase();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const formattedDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="rounded-2xl border border-[#e0d9f7] bg-white p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)]">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Left: Avatar */}
        <div className="shrink-0">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.fullName || 'Admin Avatar'}
              className="rounded-full w-16 h-16 object-cover border border-[#e0d9f7]"
            />
          ) : (
            <div className="rounded-full w-16 h-16 bg-[#f4f0fe] text-[#34088f] text-xl font-bold flex items-center justify-center border border-[#e0d9f7]">
              {getInitials(profile.fullName, profile.email)}
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-semibold font-manrope text-gray-900">
              {profile.fullName || 'Administrator'}
            </h2>
            <div className="inline-flex justify-center">
              <UserRoleBadge role={profile.role} />
            </div>
          </div>

          <p className="text-sm text-gray-500 font-inter font-medium select-text">
            {profile.email}
          </p>

          {profile.phone && (
            <p className="text-sm text-gray-400 font-inter font-medium select-text">
              Phone: {profile.phone}
            </p>
          )}

          {formattedDate && (
            <p className="text-xs text-gray-400 font-inter">
              Member since {formattedDate}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsProfileCard;
