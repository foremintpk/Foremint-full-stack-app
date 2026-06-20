'use client';

import { useState, useTransition, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus, Trash2, Loader2, UploadCloud, X, Star, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { createBlogPost, updateBlogPost, createBlogTag } from '@/lib/admin/actions/blogActions';
import { RichTextEditor, type RichTextValue } from '@/components/editor/RichTextEditor';
import { slugify } from '@/lib/blog/content';
import type { BlogPost, BlogCategory, BlogTag, BlogStatus, BlogFaq } from '@/types/admin';

interface BlogFormProps {
  post?: BlogPost;
  categories: BlogCategory[];
  allTags: BlogTag[];
}

const STATUSES: Array<{ value: BlogStatus; label: string }> = [
  { value: 'draft',     label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'archived',  label: 'Archived' },
];

const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] transition-all bg-white';

// ── Card section (collapsible accordion) ────────────────────────────────────────

function Card({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="w-full bg-white border border-[#e0d9f7] rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-4 px-6 py-4 text-left transition-colors ${open ? 'bg-[#faf8ff] border-b border-[#f0ecfb]' : 'bg-white hover:bg-[#faf8ff]'}`}
      >
        <div>
          <h2 className="text-sm font-bold font-manrope text-gray-900">{title}</h2>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-6 space-y-4">{children}</div>}
    </section>
  );
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
        {label}{required && <span className="text-[#34088f] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

// ── Featured image uploader (Cloudinary) ──────────────────────────────────────

function FeaturedImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/blogs/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? 'Upload failed'); return; }
      onChange(data.url as string);
      toast.success('Featured image uploaded');
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  if (value) {
    return (
      <div className="relative w-full max-w-md">
        <Image src={value} alt="Featured" width={640} height={360} className="rounded-xl border border-gray-200 w-full h-auto object-cover" unoptimized />
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-white/90 text-gray-700 hover:bg-white shadow"
          title="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="flex flex-col items-center justify-center gap-2 w-full max-w-md h-40 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-[#34088f]/40 hover:text-[#34088f] transition-colors disabled:opacity-50"
    >
      {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
      <span className="text-xs font-semibold">{uploading ? 'Uploading…' : 'Upload featured image'}</span>
      <span className="text-[10px]">Stored on Cloudinary · JPG/PNG/WebP · max 10MB</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }}
      />
    </button>
  );
}

// ── FAQ builder ───────────────────────────────────────────────────────────────

function FaqBuilder({ faqs, onChange }: { faqs: BlogFaq[]; onChange: (faqs: BlogFaq[]) => void }) {
  const add = () => onChange([...faqs, { question: '', answer: '' }]);
  const remove = (i: number) => onChange(faqs.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof BlogFaq, val: string) => {
    const updated = [...faqs];
    updated[i] = { ...updated[i], [field]: val };
    onChange(updated);
  };
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">FAQ #{i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <input type="text" value={faq.question} onChange={e => update(i, 'question', e.target.value)} placeholder="Question" className={inputClass} />
          <textarea value={faq.answer} onChange={e => update(i, 'answer', e.target.value)} placeholder="Answer" rows={3} className={`${inputClass} resize-none`} />
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-1.5 text-xs font-semibold text-[#34088f] hover:text-[#2a0673] transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add FAQ
      </button>
    </div>
  );
}

// ── Category selector (multi-select) ────────────────────────────────────────────

function CategorySelector({
  categories,
  selectedIds,
  onChange,
}: {
  categories: BlogCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const idx = selectedIds.indexOf(cat.id);
        const selected = idx !== -1;
        const isPrimary = idx === 0;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggle(cat.id)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 ${
              selected ? 'bg-[#34088f] text-white border-[#34088f]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#34088f]/40'
            }`}
            title={isPrimary ? 'Primary category' : undefined}
          >
            {cat.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selected ? '#fff' : cat.color }} />}
            {cat.name}
            {isPrimary && <span className="text-[9px] uppercase tracking-wide opacity-80">· primary</span>}
          </button>
        );
      })}
      {categories.length === 0 && <p className="text-xs text-gray-400">No categories yet. Create them on the Blog Categories page.</p>}
    </div>
  );
}

// ── Tag selector (with inline creation) ─────────────────────────────────────────

function TagSelector({
  allTags,
  selectedIds,
  onChange,
  onCreated,
}: {
  allTags: BlogTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreated: (tag: BlogTag) => void;
}) {
  const [newTag, setNewTag] = useState('');
  const [creating, setCreating] = useState(false);
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);

  const handleCreate = async () => {
    const name = newTag.trim();
    if (!name || creating) return;
    const existing = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedIds.includes(existing.id)) toggle(existing.id);
      setNewTag('');
      return;
    }
    setCreating(true);
    const result = await createBlogTag(name);
    setCreating(false);
    if (result.error || !result.id) { toast.error(result.error ?? 'Failed to create tag'); return; }
    onCreated({ id: result.id, name, slug: slugify(name), createdAt: new Date().toISOString() });
    setNewTag('');
    toast.success(`Tag "${name}" created`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allTags.map(tag => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
              selectedIds.includes(tag.id) ? 'bg-[#34088f] text-white border-[#34088f]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#34088f]/40'
            }`}
          >
            {tag.name}
          </button>
        ))}
        {allTags.length === 0 && <p className="text-xs text-gray-400">No tags yet — create one below.</p>}
      </div>
      <div className="flex items-center gap-2 max-w-sm">
        <input
          type="text"
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleCreate(); } }}
          placeholder="Create a new tag…"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating || !newTag.trim()}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white bg-[#34088f] hover:bg-[#2a0673] rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
        </button>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function BlogForm({ post, categories, allTags }: BlogFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [featuredImageUrl, setFeaturedImageUrl] = useState(post?.featuredImageUrl ?? '');
  const [isFeatured, setIsFeatured] = useState(post?.isFeatured ?? false);
  const [faqs, setFaqs] = useState<BlogFaq[]>(post?.faqs ?? []);
  const [availableTags, setAvailableTags] = useState<BlogTag[]>(allTags);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(post?.tags.map(t => t.id) ?? []);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(post?.categoryIds ?? []);

  const initialEditorContent = useMemo(
    () => post?.contentJson ?? post?.contentHtml ?? post?.content ?? '',
    [post]
  );
  const contentRef = useRef<RichTextValue>({
    json: post?.contentJson ?? null,
    html: post?.contentHtml ?? post?.content ?? '',
  });

  const isEdit = !!post;

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const handleSubmit = useCallback((statusOverride?: BlogStatus) => {
    setError(null);
    const form = document.getElementById('blog-form') as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);

    if (statusOverride) formData.set('status', statusOverride);
    formData.set('contentHtml', contentRef.current.html);
    formData.set('contentJson', JSON.stringify(contentRef.current.json ?? {}));
    formData.set('featuredImageUrl', featuredImageUrl);
    formData.set('isFeatured', isFeatured ? 'true' : 'false');
    formData.set('faqs', JSON.stringify(faqs));
    selectedTagIds.forEach(id => formData.append('tagIds', id));
    selectedCategoryIds.forEach(id => formData.append('categoryIds', id));

    startTransition(async () => {
      const result = isEdit
        ? await updateBlogPost(post!.id, formData)
        : await createBlogPost(formData);
      if (result.error) { setError(result.error); toast.error(result.error); return; }
      toast.success(isEdit ? 'Post updated' : 'Post created');
      router.push('/admin/blogs');
      router.refresh();
    });
  }, [featuredImageUrl, isFeatured, faqs, selectedTagIds, selectedCategoryIds, isEdit, post, router]);

  return (
    <form id="blog-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5 w-full min-w-0 max-w-full">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* ── Section 1: Basic Information ── */}
      <Card title="Basic Information" description="Core details shown in listings and search results.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title" required>
            <input name="title" value={title} onChange={e => onTitleChange(e.target.value)} placeholder="Enter blog title" className={inputClass} required />
          </Field>
          <Field label="Slug" hint="Auto-generated from the title — edit to override.">
            <input
              name="slug"
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugTouched(true); }}
              placeholder="auto-generated-from-title"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Author" required>
            <input name="author" defaultValue={post?.author} placeholder="Full name" className={inputClass} required />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={post?.status ?? 'draft'} className={inputClass}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Publish Date" hint="Required for scheduled posts.">
            <input name="publishDate" type="datetime-local" defaultValue={post?.publishDate?.slice(0, 16) ?? ''} className={inputClass} />
          </Field>
        </div>

        <Field label="Categories" hint="Assign one or more. The first selected is the primary category. Manage categories on the Blog Categories page.">
          <CategorySelector categories={categories} selectedIds={selectedCategoryIds} onChange={setSelectedCategoryIds} />
        </Field>

        <Field label="Featured Image" hint="Uploaded directly to Cloudinary; only the URL is stored.">
          <FeaturedImageUploader value={featuredImageUrl} onChange={setFeaturedImageUrl} />
        </Field>
        <Field label="Featured Image Alt Text">
          <input name="featuredImageAlt" defaultValue={post?.featuredImageAlt ?? ''} placeholder="Descriptive alt text" className={inputClass} />
        </Field>

        <Field label="Tags">
          <TagSelector
            allTags={availableTags}
            selectedIds={selectedTagIds}
            onChange={setSelectedTagIds}
            onCreated={(tag) => {
              setAvailableTags(prev => [...prev, tag]);
              setSelectedTagIds(prev => [...prev, tag.id]);
            }}
          />
        </Field>

        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="sr-only peer" />
          <span className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${isFeatured ? 'bg-[#34088f] border-[#34088f]' : 'border-gray-300 bg-white'}`}>
            {isFeatured && <Star className="h-3 w-3 text-white fill-white" />}
          </span>
          <span className="text-xs font-bold text-gray-700">Feature this post</span>
        </label>
      </Card>

      {/* ── Section 2: Content ── */}
      <Card title="Content" description="Write with the rich editor — headings, images, tables, embeds and more.">
        <RichTextEditor
          initialContent={initialEditorContent}
          onChange={(v) => { contentRef.current = v; }}
        />
        <Field label="Excerpt" hint="Leave blank to auto-generate from the first paragraph.">
          <textarea name="excerpt" defaultValue={post?.excerpt} placeholder="Short summary shown in blog listings" rows={2} className={`${inputClass} resize-none`} />
        </Field>
      </Card>

      {/* ── Section 3: SEO ── */}
      <Card title="SEO" defaultOpen={false} description="Open Graph & Twitter metadata are generated automatically from these fields and the featured image.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Meta Title" hint="Defaults to “Title | ForeMint”.">
            <input name="metaTitle" defaultValue={post?.metaTitle ?? ''} placeholder="Page title for search engines" className={inputClass} />
          </Field>
          <Field label="Focus Keyword">
            <input name="focusKeyword" defaultValue={post?.focusKeyword ?? ''} placeholder="Primary keyword phrase" className={inputClass} />
          </Field>
        </div>
        <Field label="Meta Description" hint="Leave blank to auto-generate (150–160 chars) from the first paragraph.">
          <textarea name="metaDescription" defaultValue={post?.metaDescription ?? ''} placeholder="Short description for search results" rows={3} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Canonical URL">
          <input name="canonicalUrl" defaultValue={post?.canonicalUrl ?? ''} placeholder="https://foremint.pk/blog/slug" className={inputClass} />
        </Field>
      </Card>

      {/* ── Section 4: AEO ── */}
      <Card title="Answer Engine Optimization" defaultOpen={false} description="Helps AI assistants surface this content. Other AEO fields are generated automatically.">
        <Field label="Answer Summary" hint="2–3 sentences an AI assistant can extract directly.">
          <textarea name="answerSummary" defaultValue={post?.answerSummary ?? ''} placeholder="A Wyoming LLC can be formed online with state filing fees beginning at $100…" rows={3} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="FAQ Builder" hint="Rendered as FAQ schema for rich results.">
          <FaqBuilder faqs={faqs} onChange={setFaqs} />
        </Field>
      </Card>

      {/* ── Submit actions ── */}
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={() => router.back()} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          Cancel
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={() => handleSubmit('draft')} disabled={isPending} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-[#34088f]/40 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2">
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Draft
          </button>
          <button type="submit" disabled={isPending} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#34088f] hover:bg-[#2a0673] rounded-full transition-colors disabled:opacity-50 flex items-center gap-2">
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {isEdit ? 'Update Post' : 'Save Post'}
          </button>
        </div>
      </div>
    </form>
  );
}
