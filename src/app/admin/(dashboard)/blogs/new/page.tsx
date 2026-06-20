import { getCachedBlogCategories, getCachedBlogTags } from '@/lib/admin/getBlogs';
import { BlogForm } from '../_components/BlogForm';

export const dynamic = 'force-dynamic';

export default async function NewBlogPage() {
  const [categories, allTags] = await Promise.all([
    getCachedBlogCategories(),
    getCachedBlogTags(),
  ]);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-black font-manrope text-gray-900">New Blog Post</h1>
        <p className="text-sm text-gray-500 mt-0.5 font-inter">Fill in all required fields and save as draft or publish.</p>
      </div>
      <BlogForm categories={categories} allTags={allTags} />
    </div>
  );
}
