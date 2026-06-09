'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Search } from 'lucide-react';
import type { BlogStatus } from '@/types/admin';

const STATUSES: Array<{ key: BlogStatus | 'all'; label: string }> = [
  { key: 'all',       label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'draft',     label: 'Draft' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'archived',  label: 'Archived' },
];

interface BlogListControlsProps {
  currentStatus: BlogStatus | 'all';
  currentQ: string;
}

export function BlogListControls({ currentStatus, currentQ }: BlogListControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const push = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === '' || v === 'all') params.delete(k);
      else params.set(k, v);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startTransition(() => router.push(`${pathname}?${params.toString()}` as any));
  }, [router, pathname, searchParams]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          defaultValue={currentQ}
          placeholder="Search blog posts..."
          onChange={e => {
            const val = e.target.value;
            const timer = window.setTimeout(() => push({ q: val }), 350);
            return () => window.clearTimeout(timer);
          }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] transition-all"
        />
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => push({ status: s.key })}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
              currentStatus === s.key
                ? 'bg-[#34088f] text-white border-[#34088f]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#34088f]/40'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
