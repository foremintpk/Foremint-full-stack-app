'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { createBlogPost, updateBlogPost } from '@/lib/admin/actions/blogActions';
import type { BlogPost, BlogCategory, BlogTag, BlogStatus, BlogContentType, BlogFaq } from '@/types/admin';

interface BlogFormProps {
  post?: BlogPost;
  categories: BlogCategory[];
  allTags: BlogTag[];
}

const CONTENT_TYPES: Array<{ value: BlogContentType; label: string }> = [
  { value: 'informational', label: 'Informational' },
  { value: 'guide',         label: 'Guide' },
  { value: 'comparison',    label: 'Comparison' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'cost_analysis', label: 'Cost Analysis' },
];

const STATUSES: Array<{ value: BlogStatus; label: string }> = [
  { value: 'draft',     label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'archived',  label: 'Archived' },
];

// ── Section accordion ─────────────────────────────────────────────────────────

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#e0d9f7] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${open ? 'bg-[#f4f0fe]' : 'bg-white hover:bg-gray-50/50'}`}
      >
        <span className="text-sm font-bold font-manrope text-gray-900">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-5 bg-white border-t border-[#e0d9f7] space-y-4">{children}</div>}
    </div>
  );
}

// ── Field components ──────────────────────────────────────────────────────────

const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] transition-all bg-white';

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
          <input
            type="text"
            value={faq.question}
            onChange={e => update(i, 'question', e.target.value)}
            placeholder="Question"
            className={inputClass}
          />
          <textarea
            value={faq.answer}
            onChange={e => update(i, 'answer', e.target.value)}
            placeholder="Answer"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#34088f] hover:text-[#2a0673] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add FAQ
      </button>
    </div>
  );
}

// ── Tag selector ──────────────────────────────────────────────────────────────

function TagSelector({ allTags, selectedIds, onChange }: { allTags: BlogTag[]; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {allTags.map(tag => (
        <button
          key={tag.id}
          type="button"
          onClick={() => toggle(tag.id)}
          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
            selectedIds.includes(tag.id)
              ? 'bg-[#34088f] text-white border-[#34088f]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#34088f]/40'
          }`}
        >
          {tag.name}
        </button>
      ))}
      {allTags.length === 0 && <p className="text-xs text-gray-400">No tags available. Create tags from the blog list.</p>}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function BlogForm({ post, categories, allTags }: BlogFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<BlogFaq[]>(post?.faqs ?? []);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(post?.tags.map(t => t.id) ?? []);
  const [keyTakeaways, setKeyTakeaways] = useState(post?.keyTakeaways.join('\n') ?? '');
  const [relatedEntities, setRelatedEntities] = useState(post?.relatedEntities.join(', ') ?? '');
  const [secondaryKeywords, setSecondaryKeywords] = useState(post?.secondaryKeywords.join(', ') ?? '');

  const isEdit = !!post;

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    // Inject dynamic state into formData
    formData.set('faqs', JSON.stringify(faqs));
    formData.set('keyTakeaways', keyTakeaways);
    formData.set('relatedEntities', relatedEntities);
    formData.set('secondaryKeywords', secondaryKeywords);
    selectedTagIds.forEach(id => formData.append('tagIds', id));

    startTransition(async () => {
      const result = isEdit
        ? await updateBlogPost(post!.id, formData)
        : await createBlogPost(formData);

      if (result.error) { setError(result.error); return; }
      router.push('/admin/blogs');
      router.refresh();
    });
  }, [faqs, keyTakeaways, relatedEntities, secondaryKeywords, selectedTagIds, isEdit, post, router]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* ── Core Fields ── */}
      <Section title="Core Information" defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title" required>
            <input name="title" defaultValue={post?.title} placeholder="Enter blog title" className={inputClass} required />
          </Field>
          <Field label="Slug" hint="Auto-generated from title if left empty">
            <input name="slug" defaultValue={post?.slug} placeholder="auto-generated-from-title" className={inputClass} />
          </Field>
        </div>

        <Field label="Excerpt" required hint="Short description shown in blog listings">
          <textarea name="excerpt" defaultValue={post?.excerpt} placeholder="A compelling 1–2 sentence excerpt" rows={3} className={`${inputClass} resize-none`} required />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Author" required>
            <input name="author" defaultValue={post?.author} placeholder="Full name" className={inputClass} required />
          </Field>
          <Field label="Category">
            <select name="categoryId" defaultValue={post?.categoryId ?? ''} className={inputClass}>
              <option value="">No category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={post?.status ?? 'draft'} className={inputClass}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Publish Date" hint="Required for scheduled status">
            <input name="publishDate" type="datetime-local" defaultValue={post?.publishDate?.replace('Z', '') ?? ''} className={inputClass} />
          </Field>
        </div>

        <Field label="Featured Image URL">
          <input name="featuredImageUrl" defaultValue={post?.featuredImageUrl ?? ''} placeholder="https://..." className={inputClass} />
        </Field>
        <Field label="Featured Image Alt Text">
          <input name="featuredImageAlt" defaultValue={post?.featuredImageAlt ?? ''} placeholder="Descriptive alt text" className={inputClass} />
        </Field>

        <Field label="Tags">
          <TagSelector allTags={allTags} selectedIds={selectedTagIds} onChange={setSelectedTagIds} />
        </Field>
      </Section>

      {/* ── Rich Content ── */}
      <Section title="Content">
        <Field label="Article Content" hint="Markdown or HTML supported">
          <textarea
            name="content"
            defaultValue={post?.content}
            placeholder="Write your article content here..."
            rows={20}
            className={`${inputClass} resize-y font-mono text-xs`}
          />
        </Field>
      </Section>

      {/* ── SEO Fields ── */}
      <Section title="SEO Fields">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Meta Title" hint="Ideal length: 50–60 characters">
            <input name="metaTitle" defaultValue={post?.metaTitle ?? ''} placeholder="Page title for search engines" className={inputClass} />
          </Field>
          <Field label="Focus Keyword" required>
            <input name="focusKeyword" defaultValue={post?.focusKeyword ?? ''} placeholder="Primary keyword phrase" className={inputClass} />
          </Field>
        </div>
        <Field label="Meta Description" hint="Ideal length: 150–160 characters">
          <textarea name="metaDescription" defaultValue={post?.metaDescription ?? ''} placeholder="Short description for search results" rows={3} className={`${inputClass} resize-none`} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Secondary Keywords" hint="Comma-separated">
            <input value={secondaryKeywords} onChange={e => setSecondaryKeywords(e.target.value)} placeholder="keyword1, keyword2, keyword3" className={inputClass} />
          </Field>
          <Field label="Canonical URL">
            <input name="canonicalUrl" defaultValue={post?.canonicalUrl ?? ''} placeholder="https://app.foremint.com/blog/slug" className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <Field label="OG Title">
            <input name="ogTitle" defaultValue={post?.ogTitle ?? ''} placeholder="Open Graph title" className={inputClass} />
          </Field>
          <Field label="OG Description">
            <input name="ogDescription" defaultValue={post?.ogDescription ?? ''} placeholder="Open Graph description" className={inputClass} />
          </Field>
          <Field label="OG Image URL">
            <input name="ogImage" defaultValue={post?.ogImage ?? ''} placeholder="https://..." className={inputClass} />
          </Field>
          <Field label="Twitter Title">
            <input name="twitterTitle" defaultValue={post?.twitterTitle ?? ''} placeholder="Twitter card title" className={inputClass} />
          </Field>
          <Field label="Twitter Description">
            <input name="twitterDescription" defaultValue={post?.twitterDescription ?? ''} placeholder="Twitter card description" className={inputClass} />
          </Field>
          <Field label="Twitter Image URL">
            <input name="twitterImage" defaultValue={post?.twitterImage ?? ''} placeholder="https://..." className={inputClass} />
          </Field>
        </div>
      </Section>

      {/* ── AEO Fields ── */}
      <Section title="AEO Fields (Answer Engine Optimization)">
        <Field label="Answer Summary" required hint="2–3 sentences that AI systems can extract directly">
          <textarea name="answerSummary" defaultValue={post?.answerSummary ?? ''} placeholder="A Wyoming LLC can be formed online with state filing fees beginning at $100..." rows={3} className={`${inputClass} resize-none`} />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Primary Entity" required hint="The main subject, e.g. Wyoming LLC, Registered Agent, EIN">
            <input name="primaryEntity" defaultValue={post?.primaryEntity ?? ''} placeholder="Wyoming LLC" className={inputClass} />
          </Field>
          <Field label="Related Entities" hint="Comma-separated, e.g. Registered Agent, EIN, Operating Agreement">
            <input value={relatedEntities} onChange={e => setRelatedEntities(e.target.value)} placeholder="Registered Agent, EIN, Articles of Organization" className={inputClass} />
          </Field>
        </div>

        <Field label="Content Type">
          <select name="contentType" defaultValue={post?.contentType ?? ''} className={inputClass}>
            <option value="">Select content type</option>
            {CONTENT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
          </select>
        </Field>

        <Field label="Key Takeaways" hint="One takeaway per line">
          <textarea value={keyTakeaways} onChange={e => setKeyTakeaways(e.target.value)} placeholder="Takeaway 1&#10;Takeaway 2&#10;Takeaway 3" rows={5} className={`${inputClass} resize-none`} />
        </Field>

        <Field label="FAQ Builder" hint="Add unlimited frequently asked questions">
          <FaqBuilder faqs={faqs} onChange={setFaqs} />
        </Field>
      </Section>

      {/* ── Submit actions ── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          Cancel
        </button>
        <div className="flex gap-3">
          <button
            type="submit"
            name="status"
            value="draft"
            onClick={() => {
              const statusEl = document.querySelector<HTMLSelectElement>('select[name="status"]');
              if (statusEl) statusEl.value = 'draft';
            }}
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-[#34088f]/40 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Draft
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#34088f] hover:bg-[#2a0673] rounded-full transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Update Post' : 'Save & Publish'}
          </button>
        </div>
      </div>
    </form>
  );
}
