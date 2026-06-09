import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCachedBlogPosts, getCachedBlogCategories } from '@/lib/admin/getBlogs';
import { BlogTable } from './_components/BlogTable';
import { BlogListControls } from './_components/BlogListControls';
import type { BlogStatus } from '@/types/admin';

export const revalidate = 60;

interface BlogsPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string; categoryId?: string }>;
}

export default async function BlogsPage({ searchParams }: BlogsPageProps) {
  const params = await searchParams;
  const q = params.q ?? '';
  const status = (params.status ?? 'all') as BlogStatus | 'all';
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const categoryId = params.categoryId ?? 'all';

  const [result] = await Promise.all([
    getCachedBlogPosts({ q, status, page, pageSize: 25, categoryId }),
    getCachedBlogCategories(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black font-manrope text-gray-900">Blog Management</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-inter">
            {result.total} post{result.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href={"/admin/blogs/new" as any}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#34088f] text-white text-sm font-semibold rounded-full hover:bg-[#2a0673] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Controls */}
      <BlogListControls currentStatus={status} currentQ={q} />

      {/* Table */}
      <BlogTable posts={result.posts} />

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/admin/blogs?${new URLSearchParams({ q, status, page: String(p), categoryId }).toString()}`}
              className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                p === page
                  ? 'bg-[#34088f] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-[#34088f]/40'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
