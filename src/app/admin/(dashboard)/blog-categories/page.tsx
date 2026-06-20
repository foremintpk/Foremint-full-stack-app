import { getCachedBlogCategoriesWithCounts } from '@/lib/admin/getBlogs';
import { CategoryManager } from './_components/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function BlogCategoriesPage() {
  const categories = await getCachedBlogCategoriesWithCounts();

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-black font-manrope text-gray-900">Blog Categories</h1>
        <p className="text-sm text-gray-500 mt-0.5 font-inter">
          Organize blog posts. Each post belongs to one category.
        </p>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
