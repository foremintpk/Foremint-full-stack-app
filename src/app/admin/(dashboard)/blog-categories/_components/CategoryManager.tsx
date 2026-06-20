'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Loader2, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from '@/lib/admin/actions/blogActions';
import { slugify } from '@/lib/blog/content';
import type { BlogCategory } from '@/types/admin';

const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] transition-all bg-white';

interface EditorState {
  open: boolean;
  category: BlogCategory | null;
}

function CategoryEditor({
  category,
  onClose,
  onSaved,
}: {
  category: BlogCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set('slug', slug);
    startTransition(async () => {
      const result = isEdit
        ? await updateBlogCategory(category!.id, formData)
        : await createBlogCategory(formData);
      if (result.error) { setError(result.error); toast.error(result.error); return; }
      toast.success(isEdit ? 'Category updated' : 'Category created');
      onSaved();
      onClose();
    });
  }, [isEdit, category, slug, onClose, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold font-manrope text-gray-900">{isEdit ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Name<span className="text-[#34088f] ml-0.5">*</span></label>
              <input name="name" value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} className={inputClass} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Slug</label>
              <input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="auto-generated" className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Description</label>
            <textarea name="description" defaultValue={category?.description ?? ''} rows={2} className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Color</label>
              <input name="color" type="color" defaultValue={category?.color ?? '#34088f'} className="h-10 w-full rounded-xl border border-gray-200 bg-white px-1" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Sort Order</label>
              <input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Status</label>
              <select name="isActive" defaultValue={category ? String(category.isActive) : 'true'} className={inputClass}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">Cancel</button>
            <button type="submit" disabled={isPending} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#34088f] hover:bg-[#2a0673] rounded-full transition-colors disabled:opacity-50 flex items-center gap-2">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CategoryManager({ initialCategories }: { initialCategories: BlogCategory[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState>({ open: false, category: null });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => router.refresh(), [router]);

  const handleDelete = useCallback((cat: BlogCategory) => {
    if (!window.confirm(`Delete "${cat.name}"? Posts will be left uncategorized.`)) return;
    setDeletingId(cat.id);
    startTransition(async () => {
      const result = await deleteBlogCategory(cat.id);
      setDeletingId(null);
      if (result.error) { toast.error(result.error); return; }
      toast.success('Category deleted');
      router.refresh();
    });
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditor({ open: true, category: null })}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#34088f] text-white text-sm font-semibold rounded-full hover:bg-[#2a0673] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="bg-white border border-[#e0d9f7] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-[#faf8ff] text-left text-xs font-bold uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 w-8"></th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3 text-center">Posts</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initialCategories.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No categories yet. Create your first one.</td></tr>
            )}
            {initialCategories.map((cat) => (
              <tr key={cat.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/40">
                <td className="px-5 py-3 text-gray-300"><GripVertical className="h-4 w-4" /></td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border border-gray-200" style={{ backgroundColor: cat.color ?? '#e5e7eb' }} />
                    <span className="font-semibold text-gray-900">{cat.name}</span>
                  </div>
                  {cat.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{cat.description}</p>}
                </td>
                <td className="px-5 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                <td className="px-5 py-3 text-center text-gray-600">{cat.postCount ?? 0}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${cat.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditor({ open: true, category: cat })} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(cat)} disabled={deletingId === cat.id} className="h-8 w-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50" title="Delete">
                      {deletingId === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editor.open && (
        <CategoryEditor
          category={editor.category}
          onClose={() => setEditor({ open: false, category: null })}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
