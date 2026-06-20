'use client';

/**
 * RichTextEditor — Notion/Medium-style Tiptap editor for blog content.
 *
 * Emits both the structured ProseMirror JSON (editor source of truth) and the
 * rendered HTML on every change. Images are uploaded straight to Cloudinary via
 * /api/admin/blogs/upload; only the returned secure URL is embedded in content.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote,
  List, ListOrdered, Minus, Link2, Image as ImageIcon, Film as YoutubeIcon,
  Table as TableIcon, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Loader2, Code2,
} from 'lucide-react';
import { toast } from 'sonner';
import { blogEditorExtensions, HEADING_LEVELS } from '@/lib/blog/tiptapExtensions';

export interface RichTextValue {
  json: Record<string, unknown> | null;
  html: string;
}

interface RichTextEditorProps {
  initialContent?: Record<string, unknown> | string | null;
  onChange: (value: RichTextValue) => void;
}

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/admin/blogs/upload', { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error(data.error ?? 'Image upload failed');
    return null;
  }
  return data.url as string;
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 flex items-center justify-center rounded-lg text-gray-600 transition-colors disabled:opacity-40 ${
        active ? 'bg-[#34088f] text-white' : 'hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gray-200" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importHtml, setImportHtml] = useState('');

  const runImport = useCallback(() => {
    const html = importHtml.trim();
    if (!html) return;
    // Parsing through the schema strips <head>/<style>/<script>/classes/inline styles,
    // leaving only clean semantic nodes.
    editor.chain().focus().setContent(html, { parseOptions: { preserveWhitespace: false } }).run();
    setImportHtml('');
    setImportOpen(false);
    toast.success('HTML imported & cleaned');
  }, [editor, importHtml]);

  const handleImageFile = useCallback(async (file: File) => {
    if (uploading) return;
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (!url) return;
    const alt = window.prompt('Image alt text (for accessibility & SEO):', '') ?? '';
    const caption = window.prompt('Image caption (optional):', '') ?? '';
    editor.chain().focus().insertContent({ type: 'figure', attrs: { src: url, alt, caption } }).run();
  }, [editor, uploading]);

  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (use a relative path like /services for internal links):', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    const url = window.prompt('YouTube URL:');
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
  }, [editor]);

  const setHeading = useCallback((value: string) => {
    if (value === 'p') {
      editor.chain().focus().setParagraph().run();
    } else {
      const level = Number(value) as (typeof HEADING_LEVELS)[number];
      editor.chain().focus().toggleHeading({ level }).run();
    }
  }, [editor]);

  const currentBlock = HEADING_LEVELS.find((l) => editor.isActive('heading', { level: l }));

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50/60 px-2 py-1.5 sticky top-0 z-10 rounded-t-xl">
      <select
        value={currentBlock ? String(currentBlock) : 'p'}
        onChange={(e) => setHeading(e.target.value)}
        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 focus:outline-none"
        title="Text style"
      >
        <option value="p">Paragraph</option>
        {HEADING_LEVELS.map((l) => <option key={l} value={String(l)}>Heading {l}</option>)}
      </select>
      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote"><Quote className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block"><Code className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><Minus className="h-4 w-4" /></ToolbarButton>
      <Divider />

      <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Link"><Link2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Insert image">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      </ToolbarButton>
      <ToolbarButton onClick={addYoutube} title="YouTube embed"><YoutubeIcon className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table"><TableIcon className="h-4 w-4" /></ToolbarButton>
      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left"><AlignLeft className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center"><AlignCenter className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right"><AlignRight className="h-4 w-4" /></ToolbarButton>
      <Divider />

      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo2 className="h-4 w-4" /></ToolbarButton>
      <Divider />
      <ToolbarButton onClick={() => setImportOpen(true)} title="Import / paste HTML"><Code2 className="h-4 w-4" /></ToolbarButton>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageFile(file);
          e.target.value = '';
        }}
      />

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setImportOpen(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold font-manrope text-gray-900">Import HTML</h3>
              <p className="text-xs text-gray-500 mt-0.5">Paste any HTML (even a full document). Styling, scripts and classes are stripped — only semantic content is kept. This replaces the current content.</p>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={importHtml}
                onChange={(e) => setImportHtml(e.target.value)}
                placeholder="<h2>Heading</h2><p>Paragraph…</p><table>…</table>"
                rows={12}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] resize-y"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setImportOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">Cancel</button>
                <button type="button" onClick={runImport} disabled={!importHtml.trim()} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#34088f] hover:bg-[#2a0673] rounded-full transition-colors disabled:opacity-50">Import &amp; clean</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Editor ──────────────────────────────────────────────────────────────────

export function RichTextEditor({ initialContent, onChange }: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false, // required for Next.js SSR — avoids hydration mismatch
    extensions: blogEditorExtensions, // shared schema — identical to the server-side renderer
    content: initialContent ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[420px] px-5 py-4 focus:outline-none',
      },
      // Parse pasted raw HTML *source* (arriving as text/plain) into clean nodes,
      // instead of inserting it as escaped literal text.
      handlePaste(view, event) {
        const cd = event.clipboardData;
        if (!cd) return false;
        const html = cd.getData('text/html');
        const text = cd.getData('text/plain');
        if (!html && text && /<[a-z!][\s\S]*>/i.test(text)) {
          event.preventDefault();
          editor?.chain().focus().insertContent(text, { parseOptions: { preserveWhitespace: false } }).run();
          return true;
        }
        return false;
      },
      handleDrop(view, event) {
        const file = event.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
          event.preventDefault();
          uploadImage(file).then((url) => {
            if (url) editor?.chain().focus().insertContent({ type: 'figure', attrs: { src: url, alt: '', caption: '' } }).run();
          });
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor: ed }) {
      onChangeRef.current({ json: ed.getJSON() as Record<string, unknown>, html: ed.getHTML() });
    },
  });

  // Emit an initial value so the parent has html/json before any edit.
  useEffect(() => {
    if (editor) {
      onChangeRef.current({ json: editor.getJSON() as Record<string, unknown>, html: editor.getHTML() });
    }
  }, [editor]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
