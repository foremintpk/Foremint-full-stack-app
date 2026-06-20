/**
 * @file src/lib/blog/render.ts
 * @description Server-side generation of clean, semantic blog HTML from the
 * editor's structured `content_json`. This is the single source of the rendered
 * article body — deterministic and identical for every article, independent of
 * the browser/editor version that produced the JSON.
 *
 * Pipeline: content_json → renderToHTMLString (Tiptap schema) → strip
 * style/class + demote H1→H2 → inject heading anchor IDs + extract TOC.
 */

import { renderToHTMLString } from '@tiptap/static-renderer';
import { blogEditorExtensions } from './tiptapExtensions';
import { sanitizeBlogHtml, processBlogContent } from './content';
import type { BlogTocEntry } from '@/types/admin';

function isEmptyDoc(json: unknown): boolean {
  if (!json || typeof json !== 'object') return true;
  const content = (json as { content?: unknown[] }).content;
  return !Array.isArray(content) || content.length === 0;
}

/**
 * Generate semantic article-body HTML + table of contents from Tiptap JSON.
 * Returns empty html when the JSON is empty (caller may fall back to a stored
 * HTML string for legacy posts).
 */
export function generateBlogHtmlFromJson(contentJson: unknown): { html: string; toc: BlogTocEntry[] } {
  if (isEmptyDoc(contentJson)) return { html: '', toc: [] };

  let raw = '';
  try {
    raw = renderToHTMLString({
      extensions: blogEditorExtensions,
      content: contentJson as Parameters<typeof renderToHTMLString>[0]['content'],
    });
  } catch {
    return { html: '', toc: [] };
  }

  return processBlogContent(sanitizeBlogHtml(raw));
}
