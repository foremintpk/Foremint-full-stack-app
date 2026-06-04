/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/SectionEditWrapper.tsx
 * @description Beautiful edit wrapper with saving spinner state and inline error alerts.
 */

'use client';

import React, { useState } from 'react';
import { Pencil, Save, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SectionEditWrapperProps {
  sectionTitle: string;
  onSave: () => Promise<{ success: boolean; error?: string }>;
  children: (isEditing: boolean) => React.ReactNode;
  onCancel?: () => void;
}

export function SectionEditWrapper({
  sectionTitle,
  onSave,
  children,
  onCancel,
}: SectionEditWrapperProps): React.JSX.Element {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await onSave();
      if (res.success) {
        setIsEditing(false);
        router.refresh();
      } else {
        setSaveError(res.error || 'Failed to save changes');
      }
    } catch (err: any) {
      setSaveError(err?.message || 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSaveError(null);
    setIsEditing(false);
    if (onCancel) onCancel();
  };

  return (
    <div className="space-y-4">
      {/* Section Header Controls */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <h4 className="text-xs md:text-sm font-bold font-manrope text-gray-900">
          {sectionTitle}
        </h4>
        
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              aria-label={`Edit ${sectionTitle}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#34088f] hover:bg-[#34088f]/5 rounded-full transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-full transition-all disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-[#34088f] hover:opacity-90 rounded-full transition-all disabled:opacity-70 shadow-sm"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSaving ? 'Saving' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Render Sub-Section Content */}
      <div className="relative">
        {children(isEditing)}
      </div>

      {/* Inline Error Alert */}
      {saveError && (
        <div className="p-3 text-xs bg-red-50 text-red-600 rounded-2xl border border-red-200">
          {saveError}
        </div>
      )}
    </div>
  );
}
