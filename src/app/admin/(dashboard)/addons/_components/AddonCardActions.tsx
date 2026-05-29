'use client';

import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Addon, AddonCategory } from '@/types/admin';
import { AddonModal } from './AddonModal';
import { AddonDeleteConfirm } from './AddonDeleteConfirm';

interface AddonCardActionsProps {
  addonId: string;
  addon: Addon;
  categories: AddonCategory[];
}

export function AddonCardActions({ addonId, addon, categories }: AddonCardActionsProps) {
  const [modalMode, setModalMode] = useState<'edit' | 'delete' | null>(null);

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setModalMode('edit')}
          className="p-1.5 rounded-full text-gray-400 hover:text-[#34088f] hover:bg-[#f4f0fe] transition-colors"
          aria-label="Edit addon"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setModalMode('delete')}
          className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Delete addon"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {modalMode === 'edit' && (
        <AddonModal
          mode="edit"
          addon={addon}
          categories={categories}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === 'delete' && (
        <AddonDeleteConfirm
          addon={addon}
          onClose={() => setModalMode(null)}
        />
      )}
    </>
  );
}
