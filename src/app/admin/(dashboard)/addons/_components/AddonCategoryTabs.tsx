'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AddonCategory } from '@/types/admin';
import { Loader2 } from 'lucide-react';

interface AddonCategoryTabsProps {
  categories: AddonCategory[];
  activeCategoryId: string;
}

export function AddonCategoryTabs({ categories, activeCategoryId }: AddonCategoryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (categoryId: string) => {
    if (categoryId === activeCategoryId || isPending) return;

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (categoryId === 'all') {
        params.delete('categoryId');
      } else {
        params.set('categoryId', categoryId);
      }
      router.push(`/admin/addons?${params.toString()}` as any);
    });
  };

  return (
    <div className={`overflow-x-auto flex gap-2 pb-1 scrollbar-none transition-opacity duration-150 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
      <button
        onClick={() => handleSelect('all')}
        disabled={isPending}
        className={`shrink-0 flex items-center justify-center transition-all ${
          activeCategoryId === 'all'
            ? 'bg-[#34088f] text-white rounded-full px-4 py-1.5 text-sm font-medium shadow-[0_1px_4px_rgba(52,8,143,0.06)]'
            : 'border border-[#e0d9f7] bg-white text-gray-600 rounded-full px-4 py-1.5 text-sm hover:border-[#34088f] hover:text-[#34088f]'
        }`}
      >
        {isPending && activeCategoryId === 'all' ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
        All
      </button>

      {categories.map((cat) => {
        const isActive = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            disabled={isPending}
            className={`shrink-0 flex items-center justify-center transition-all ${
              isActive
                ? 'bg-[#34088f] text-white rounded-full px-4 py-1.5 text-sm font-medium shadow-[0_1px_4px_rgba(52,8,143,0.06)]'
                : 'border border-[#e0d9f7] bg-white text-gray-600 rounded-full px-4 py-1.5 text-sm hover:border-[#34088f] hover:text-[#34088f]'
            }`}
          >
            {isPending && isActive ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
