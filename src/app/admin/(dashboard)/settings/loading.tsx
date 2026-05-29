import React from 'react';

export function SettingsLoading(): React.JSX.Element {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-12 font-inter">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-32 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded-full animate-pulse" />
      </div>

      {/* Profile Card Skeleton */}
      <div className="rounded-2xl border border-[#e0d9f7] bg-white p-6 shadow-[0_1px_4px_rgba(52,8,143,0.02)]">
        <div className="flex items-start gap-5">
          <div className="shrink-0 rounded-full w-16 h-16 bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="h-6 w-40 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-48 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-32 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Email Form Card Skeleton */}
      <div className="rounded-2xl border border-[#e0d9f7] bg-white p-6 shadow-[0_1px_4px_rgba(52,8,143,0.02)] space-y-5">
        <div className="space-y-2">
          <div className="h-5 w-28 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-3 w-56 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-16 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-10 w-full bg-gray-50 rounded-full animate-pulse border border-gray-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-28 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-10 w-full bg-gray-50 rounded-full animate-pulse border border-gray-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-10 w-full bg-gray-50 rounded-full animate-pulse border border-gray-100" />
          </div>
        </div>
      </div>

      {/* Password Form Card Skeleton */}
      <div className="rounded-2xl border border-[#e0d9f7] bg-white p-6 shadow-[0_1px_4px_rgba(52,8,143,0.02)] space-y-5">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-3 w-64 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-10 w-full bg-gray-50 rounded-full animate-pulse border border-gray-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-10 w-full bg-gray-50 rounded-full animate-pulse border border-gray-100" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-28 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-10 w-full bg-gray-50 rounded-full animate-pulse border border-gray-100" />
          </div>
        </div>
      </div>

      {/* Danger Zone Skeleton */}
      <div className="rounded-2xl border border-red-100 bg-red-50/10 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-5 w-24 bg-red-100 rounded-full animate-pulse" />
          <div className="h-3.5 w-60 bg-red-50/50 rounded-full animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-red-100/50 rounded-full animate-pulse border border-red-200" />
      </div>
    </div>
  );
}

export default SettingsLoading;
