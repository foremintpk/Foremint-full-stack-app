'use client';

import React, { useState } from 'react';
import { AddonCategoryModal } from './AddonCategoryModal';
import { AddonModal } from './AddonModal';

interface CategoryManagerButtonProps {
  categories: any[];
}

export function CategoryManagerButton({ categories }: CategoryManagerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-10 px-5 bg-white border border-[#e0d9f7] text-[#34088f] hover:bg-[#f4f0fe] rounded-full text-xs font-bold transition-all shrink-0"
      >
        Manage Categories
      </button>
      {isOpen && (
        <AddonCategoryModal
          categories={categories}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

interface AddonCreatorButtonProps {
  categories: any[];
}

export function AddonCreatorButton({ categories }: AddonCreatorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="h-10 px-5 bg-[#34088f] hover:bg-[#34088f]/90 text-white rounded-full text-xs font-bold transition-all shadow-[0_1px_4px_rgba(52,8,143,0.06)] shrink-0"
      >
        New Addon
      </button>
      {isOpen && (
        <AddonModal
          mode="create"
          categories={categories}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
