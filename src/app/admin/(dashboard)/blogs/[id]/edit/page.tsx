import { notFound } from 'next/navigation';
import { getCachedBlogPost, getCachedBlogCategories, getCachedBlogTags } from '@/lib/admin/getBlogs';
import { BlogForm } from '../../_components/BlogForm';

export const dynamic = 'force-dynamic';

interface EditBlogPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  const { id } = await params;

  const [post, categories, allTags] = await Promise.all([
    getCachedBlogPost(id),
    getCachedBlogCategories(),
    getCachedBlogTags(),
  ]);

  if (!post) notFound();

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black font-manrope text-gray-900">Edit Blog Post</h1>
        <p className="text-sm text-gray-500 mt-0.5 font-inter truncate max-w-xl">{post.title}</p>
      </div>
      <BlogForm post={post} categories={categories} allTags={allTags} />
    </div>
  );
}
