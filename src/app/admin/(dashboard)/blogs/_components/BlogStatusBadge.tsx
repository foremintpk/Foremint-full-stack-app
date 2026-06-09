import type { BlogStatus } from '@/types/admin';

const STATUS_CONFIG: Record<BlogStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600 border-gray-200' },
  published: { label: 'Published', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  archived:  { label: 'Archived',  className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export function BlogStatusBadge({ status }: { status: BlogStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
