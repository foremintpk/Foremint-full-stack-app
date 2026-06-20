/**
 * Figure — a custom Tiptap block node for images that carry both Alt Text and a
 * Caption. Renders semantic `<figure><img><figcaption></figure>` markup so the
 * persisted content_html is frontend-ready and accessible.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface FigureAttrs {
  src: string;
  alt?: string | null;
  caption?: string | null;
}

export const Figure = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      caption: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          const img = el.querySelector('img');
          if (!img) return false;
          const figcaption = el.querySelector('figcaption');
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') ?? '',
            caption: figcaption?.textContent ?? '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, caption } = HTMLAttributes as Record<string, string>;
    const img = ['img', mergeAttributes({ src, alt: alt ?? '', loading: 'lazy' })];
    if (caption) {
      return ['figure', { class: 'blog-figure' }, img, ['figcaption', {}, caption]] as const;
    }
    return ['figure', { class: 'blog-figure' }, img] as const;
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('figure');
      dom.className = 'blog-figure';
      dom.style.margin = '1rem 0';

      const img = document.createElement('img');
      img.src = node.attrs.src ?? '';
      img.alt = node.attrs.alt ?? '';
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      img.style.display = 'block';
      dom.appendChild(img);

      if (node.attrs.caption) {
        const cap = document.createElement('figcaption');
        cap.textContent = node.attrs.caption;
        cap.style.fontSize = '12px';
        cap.style.color = '#6b7280';
        cap.style.marginTop = '6px';
        cap.style.textAlign = 'center';
        dom.appendChild(cap);
      }

      return { dom };
    };
  },
});
