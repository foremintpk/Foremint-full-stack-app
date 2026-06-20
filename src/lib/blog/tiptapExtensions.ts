/**
 * Shared Tiptap extension set — the single schema used by BOTH the in-browser
 * editor (RichTextEditor) and the server-side HTML generator
 * (lib/blog/render.ts). Keeping them identical guarantees that `content_json`
 * round-trips to the exact same semantic `content_html` everywhere.
 *
 * The schema itself enforces clean output: anything pasted that isn't a known
 * node/mark (e.g. <head>, <style>, <script>, wrapper <div>s, class/inline-style
 * attributes) is dropped on parse, leaving only semantic structure.
 */

import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import { Figure } from '@/components/editor/extensions/figure';

export const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export const blogEditorExtensions = [
  StarterKit.configure({
    heading: { levels: [...HEADING_LEVELS] },
    link: {
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
    },
  }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Youtube.configure({ controls: true, nocookie: true, modestBranding: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  // Parses pasted bare <img> so images aren't lost; rendered with lazy loading.
  Image.configure({ inline: false, HTMLAttributes: { loading: 'lazy' } }),
  // Image-with-caption: <figure><img><figcaption>.
  Figure,
];
