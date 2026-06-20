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
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Quote,
  List, ListOrdered, Minus, Link2, Image as ImageIcon, Film as YoutubeIcon,
  Table as TableIcon, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Figure } from './extensions/figure';

export interface RichTextValue {
  json: Record<string, unknown> | null;
  html: string;
}

interface RichTextEditorProps {
  initialContent?: Record<string, unknown> | string | null;
  onChange: (value: RichTextValue) => void;
}

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

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
    </div>
  );
}

// ── Editor ──────────────────────────────────────────────────────────────────

export function RichTextEditor({ initialContent, onChange }: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false, // required for Next.js SSR — avoids hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: { levels: [...HEADING_LEVELS] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Youtube.configure({ controls: true, nocookie: true, modestBranding: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Figure,
    ],
    content: initialContent ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[420px] px-5 py-4 focus:outline-none',
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
