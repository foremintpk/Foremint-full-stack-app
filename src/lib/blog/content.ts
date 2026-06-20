/**
 * @file src/lib/blog/content.ts
 * @description Pure helpers for the Blog CMS — slug generation, automatic
 * excerpt / meta-description / reading-time derivation, and Table-of-Contents
 * extraction with deterministic anchor-ID injection.
 *
 * These functions are dependency-free and run on both server and client so the
 * editor preview and the persisted values stay in sync.
 */

import type { BlogTocEntry } from '@/types/admin';

// ── Slugs ─────────────────────────────────────────────────────────────────────

/** URL-safe slug from arbitrary text. "Understanding U.S. LLC Taxation" → "understanding-us-llc-taxation". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')                 // decompose accents (é → e + ́)
    .replace(/[^a-z0-9\s-]/g, '')      // drop accents marks & punctuation (U.S. → us)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
    .replace(/-$/, '');
}

// ── HTML → text utilities ──────────────────────────────────────────────────────

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
};

function decodeEntities(text: string): string {
  return text.replace(/&[a-z]+;|&#\d+;/gi, (m) => {
    if (ENTITY_MAP[m]) return ENTITY_MAP[m];
    const num = /^&#(\d+);$/.exec(m);
    return num ? String.fromCharCode(Number(num[1])) : m;
  });
}

/** Strip all tags and collapse whitespace, returning readable plain text. */
export function stripHtml(html: string): string {
  if (!html) return '';
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Plain text of the first non-empty paragraph (falls back to whole document). */
export function firstParagraphText(html: string): string {
  if (!html) return '';
  const matches = html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi);
  for (const m of matches) {
    const text = stripHtml(m[1]);
    if (text) return text;
  }
  return stripHtml(html);
}

// ── Derived values ──────────────────────────────────────────────────────────────

/** Truncate at a word boundary without exceeding `max` chars; appends an ellipsis. */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${slice.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/** Excerpt auto-generated from the first paragraph (~200 chars). */
export function generateExcerpt(html: string): string {
  return truncateAtWord(firstParagraphText(html), 200);
}

/** Meta description from the first paragraph, targeting 150–160 chars. */
export function generateMetaDescription(html: string): string {
  const text = firstParagraphText(html);
  if (text.length <= 160) return text;
  return truncateAtWord(text, 157);
}

/** Default meta title: "Title | ForeMint". */
export function generateMetaTitle(title: string): string {
  const clean = title.trim();
  if (!clean) return 'ForeMint';
  return clean.endsWith('| ForeMint') ? clean : `${clean} | ForeMint`;
}

/** Reading time in minutes (200 wpm), minimum 1. */
export function calculateReadingTime(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Word count of the rendered content. */
export function countWords(html: string): number {
  return stripHtml(html).split(/\s+/).filter(Boolean).length;
}

// ── Table of Contents ───────────────────────────────────────────────────────────

const HEADING_RE = /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;

/**
 * Inject deterministic, unique anchor IDs into every H2/H3 and return both the
 * rewritten HTML and the extracted Table of Contents. The frontend uses the TOC
 * to build the "On This Page" navigation and the matching IDs as scroll targets.
 */
export function processBlogContent(html: string): { html: string; toc: BlogTocEntry[] } {
  if (!html) return { html: '', toc: [] };

  const toc: BlogTocEntry[] = [];
  const used = new Set<string>();

  const out = html.replace(HEADING_RE, (full, levelStr: string, attrs: string, inner: string) => {
    const level = Number(levelStr) as 2 | 3;
    const title = stripHtml(inner);
    if (!title) return full; // leave empty headings untouched

    const base = slugify(title) || `section-${toc.length + 1}`;
    let id = base;
    let n = 1;
    while (used.has(id)) id = `${base}-${++n}`;
    used.add(id);

    toc.push({ id, title, level });
    const cleanedAttrs = attrs.replace(/\s+id\s*=\s*"[^"]*"/gi, '');
    return `<h${levelStr}${cleanedAttrs} id="${id}">${inner}</h${levelStr}>`;
  });

  return { html: out, toc };
}
