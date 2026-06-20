import Link from 'next/link';
import { Clock, Eye, Edit3, ExternalLink } from 'lucide-react';
import { BlogStatusBadge } from './BlogStatusBadge';
import { BlogDeleteButton } from './BlogDeleteButton';
import type { BlogPost } from '@/types/admin';

interface BlogTableProps {
  posts: BlogPost[];
}

// Public site base for "View on site". Override via NEXT_PUBLIC_FRONTEND_URL.
const FRONTEND_BASE = (process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'https://foremint.pk').replace(/\/$/, '');

export function BlogTable({ posts }: BlogTableProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <p className="text-gray-400 font-semibold text-sm">No blog posts found.</p>
        <p className="text-gray-300 text-xs mt-1">Create your first blog post to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e0d9f7] overflow-hidden shadow-[0_1px_4px_rgba(52,8,143,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Title</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Author</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Category</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Reading</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.map(post => (
              <tr key={post.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-5 py-4 max-w-[260px]">
                  <p className="text-sm font-semibold text-gray-900 truncate font-manrope">{post.title}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{post.slug}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs text-gray-700 font-medium">{post.author}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs text-gray-500">{post.categoryName ?? '—'}</span>
                </td>
                <td className="px-5 py-4">
                  <BlogStatusBadge status={post.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{post.readingTimeMinutes} min</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs text-gray-500">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString()
                      : new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    {post.status === 'published' && (
                      <>
                        <a
                          href={`${FRONTEND_BASE}/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View on site"
                          className="p-1.5 rounded-full text-gray-400 hover:text-[#34088f] hover:bg-[#f4f0fe] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`/api/public/blogs/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View API (JSON)"
                          className="p-1.5 rounded-full text-gray-400 hover:text-[#34088f] hover:bg-[#f4f0fe] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                    <Link
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      href={`/admin/blogs/${post.id}/edit` as any}
                      title="Edit"
                      className="p-1.5 rounded-full text-gray-400 hover:text-[#34088f] hover:bg-[#f4f0fe] transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Link>
                    <BlogDeleteButton postId={post.id} postTitle={post.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
