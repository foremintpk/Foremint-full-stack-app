# ForeMint Blog API — Frontend Integration Specification

> Source of truth for the **foremint.pk** frontend. Every endpoint, field name, and
> response shape below is taken directly from the backend implementation
> (`app.foremint.pk`, Next.js route handlers under `src/app/api/public/*`). Field
> names are **exactly** as returned (camelCase JSON). Do not rename or invent fields.

---

## 0. Global facts (read first)

| Fact | Value |
|------|-------|
| **Base URL** | The backend admin app host, e.g. `https://app.foremint.pk`. All public endpoints live under `/api/public`. Put it in an env var, e.g. `NEXT_PUBLIC_BLOG_API_BASE=https://app.foremint.pk`. |
| **Auth** | **None.** All `/api/public/*` endpoints are public. Do **not** send Authorization headers. |
| **Required headers** | None. Plain `GET`. (`Content-Type` not required for GET.) |
| **CORS** | Allowlisted origins only (not `*`). Allowed: `https://foremint.pk`, `https://www.foremint.pk`, `https://foremintfrontend.vercel.app`, `http://localhost:3000`. Add more via the backend env var `BLOG_CORS_ORIGINS` (comma-separated). Responses set `Vary: Origin`. Preflight `OPTIONS` is handled on every endpoint. SSR/server-to-server fetches send no `Origin` and are unaffected. |
| **Caching** | Each response sets `Cache-Control` (60–300s `max-age` + `stale-while-revalidate`). You may also use Next `fetch` cache/ISR on top. |
| **Field casing** | **camelCase** in JSON (DB columns are snake_case but the API maps them). |
| **Only published content** | Public endpoints return **only** posts with `status = 'published'` **and** `publishedAt <= now`. Draft / scheduled / archived posts are never returned. |
| **Image URLs** | Always **absolute Cloudinary HTTPS URLs** (e.g. `https://res.cloudinary.com/<cloud>/image/upload/...`). **Never** prepend a base URL. May be `null`. |
| **Content rendering** | `contentHtml` is **server-generated, clean semantic HTML** (the article *body* fragment): only `h2–h6, p, ul/ol/li, table>thead/tbody/tr/th/td, figure>img+figcaption, blockquote, pre>code, a, hr, iframe` — **no** `class`/`style`/wrapper `div`s, exactly one logical heading hierarchy (any inner H1 is demoted to H2), heading anchor IDs already injected, images `loading="lazy"`. Render it with `dangerouslySetInnerHTML` inside your own design-system wrapper (a `BlogContent` component) — style by element selector, never inject classes. (`contentJson` is the Tiptap document, consumed by the editor only.) |

---

## 1. Endpoint Index

| # | Method | URL | Purpose | Auth |
|---|--------|-----|---------|------|
| 1 | GET | `/api/public/blogs` | Paginated list of published posts (cards) | Public |
| 2 | GET | `/api/public/blogs/{slug}` | One full post by **slug** (body, TOC, related, SEO) | Public |
| 3 | GET | `/api/public/blog-categories` | All active categories + post counts | Public |
| 4 | GET | `/api/public/blog-categories/{slug}` | One category + its paginated posts | Public |
| 5 | GET | `/api/public/categories` | **Alias** of #3 (identical response) | Public |
| 6 | GET | `/api/public/tags` | All tags (`id`, `name`, `slug`) | Public |
| 7 | POST | `/api/public/blogs/{slug}/view` | Records one view (powers popularity) | Public |
| 8 | GET | `/api/public/blogs/trending` | Posts ranked by recent views | Public |

The only writable public endpoint is #7 (view tracking). All content creation/editing happens only in the admin app.

> **Popularity is automatic.** "Most read" / "Popular" = all-time views; "Trending" = views in a recent window. Admins do nothing — the frontend records a view (endpoint #7) when a post page loads, and the rankings derive from that. See §11.

---

## 2. `GET /api/public/blogs` — Listing

Returns published posts as **cards** (the body/TOC/related fields are intentionally empty in list mode — fetch the single endpoint for those).

### Query parameters (all optional)
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | int ≥ 1 | `1` | Page number (page-based pagination). |
| `pageSize` | int 1–50 | `10` | Clamped to max 50. |
| `category` | string | — | Category **slug** (e.g. `taxation`). |
| `tag` | string | — | Tag **slug** (filtered in-memory within the page). |
| `q` | string | — | Search — matches `title` **or** `excerpt` (case-insensitive `ILIKE`). |
| `featured` | `true` | — | When `true`, returns only `isFeatured` posts. |
| `sort` | `newest` \| `oldest` \| `title` \| `popular` | `newest` | `newest`/`oldest` = by `publishedAt`; `title` = A→Z; `popular` = by `viewCount` desc (all-time "most read"). |

### Response `200`
```json
{
  "posts": [
    {
      "id": "28504779-fdb2-4840-9d5a-57c5620495b1",
      "title": "Understanding U.S. LLC Taxation",
      "slug": "understanding-us-llc-taxation",
      "excerpt": "A plain-English guide to how a U.S. LLC is taxed when you live outside the United States — pass-through basics, the foreign-owned single-member LLC rules, and the forms that keep you compliant.",
      "featuredImageUrl": "https://res.cloudinary.com/foremint/image/upload/v1/foremint/blog/abc.jpg",
      "featuredImageAlt": "US LLC taxation overview",
      "author": "Foremint Tax Desk",
      "categoryName": "Taxation",
      "categorySlug": "taxation",
      "categoryColor": "#34088f",
      "isFeatured": true,
      "tags": [{ "name": "LLC", "slug": "llc" }, { "name": "Tax", "slug": "tax" }],
      "publishedAt": "2026-06-14T09:00:00.000Z",
      "readingTimeMinutes": 9,
      "wordCount": 1740,
      "content": "",
      "contentHtml": null,
      "contentJson": null,
      "toc": [],
      "relatedBlogs": [],
      "metaTitle": "Understanding U.S. LLC Taxation | ForeMint",
      "metaDescription": "How a U.S. LLC is taxed when you live abroad — pass-through basics...",
      "focusKeyword": "us llc taxation",
      "canonicalUrl": null,
      "ogTitle": "Understanding U.S. LLC Taxation | ForeMint",
      "ogDescription": "How a U.S. LLC is taxed when you live abroad...",
      "ogImage": "https://res.cloudinary.com/foremint/image/upload/v1/foremint/blog/abc.jpg",
      "twitterTitle": "Understanding U.S. LLC Taxation | ForeMint",
      "twitterDescription": "How a U.S. LLC is taxed when you live abroad...",
      "twitterImage": "https://res.cloudinary.com/foremint/image/upload/v1/foremint/blog/abc.jpg",
      "answerSummary": "A foreign-owned single-member US LLC is a pass-through...",
      "primaryEntity": "US LLC",
      "keyTakeaways": [],
      "faqs": [{ "question": "Do I owe US tax?", "answer": "Often $0 if your income is non-ECI..." }],
      "structuredData": { "article": { "@context": "https://schema.org", "@type": "Article" } }
    }
  ],
  "total": 12,
  "page": 1,
  "pageSize": 10,
  "totalPages": 2
}
```

### Pagination model
- **Page-based** (not cursor). Meta fields: `total`, `page`, `pageSize`, `totalPages`.
- There is **no** `hasNext`/`hasPrev`/`links` — derive on the client:
  - `hasNext = page < totalPages`
  - `hasPrev = page > 1`

### Notes for the listing page
- In list mode `content`, `contentHtml`, `contentJson`, `toc`, `relatedBlogs` are **always** empty/`null` — they are only populated by the single-post endpoint.
- For the **Featured hero card** in the design, call `/api/public/blogs?featured=true&pageSize=1` (or take the first `isFeatured` post).

---

## 3. `GET /api/public/blogs/{slug}` — Single Post

Path param: **`slug`** (string, the post's URL slug). This is the canonical detail route — there is **no** `/blogs/{id}` route.

### Response `200`
Same object shape as a listing post, but with the body fields populated:
```json
{
  "post": {
    "id": "28504779-fdb2-4840-9d5a-57c5620495b1",
    "title": "Understanding U.S. LLC Taxation",
    "slug": "understanding-us-llc-taxation",
    "excerpt": "A plain-English guide to how a U.S. LLC is taxed...",
    "featuredImageUrl": "https://res.cloudinary.com/foremint/image/upload/v1/.../abc.jpg",
    "featuredImageAlt": "US LLC taxation overview",
    "author": "Foremint Tax Desk",
    "categoryName": "Taxation",
    "categorySlug": "taxation",
    "categoryColor": "#34088f",
    "isFeatured": true,
    "tags": [{ "name": "LLC", "slug": "llc" }],
    "publishedAt": "2026-06-14T09:00:00.000Z",
    "readingTimeMinutes": 9,
    "wordCount": 1740,
    "content": "Plain-text fallback of the article...",
    "contentHtml": "<h2 id=\"pass-through-taxation-explained\">Pass-through taxation, explained</h2><p>By default, a U.S. LLC...</p><h2 id=\"the-foreign-owned-single-member-llc\">The foreign-owned single-member LLC</h2>...",
    "contentJson": { "type": "doc", "content": [ /* Tiptap nodes */ ] },
    "toc": [
      { "id": "pass-through-taxation-explained", "title": "Pass-through taxation, explained", "level": 2 },
      { "id": "the-foreign-owned-single-member-llc", "title": "The foreign-owned single-member LLC", "level": 2 },
      { "id": "what-you-actually-owe", "title": "What you actually owe", "level": 2 }
    ],
    "relatedBlogs": [
      {
        "id": "9f1c...",
        "title": "EIN Without an SSN: The Complete Walkthrough",
        "slug": "ein-without-an-ssn",
        "excerpt": "You don't need a Social Security Number to get an IRS tax ID...",
        "featuredImageUrl": "https://res.cloudinary.com/foremint/image/upload/v1/.../ein.jpg",
        "featuredImageAlt": "EIN walkthrough",
        "categoryName": "Formation",
        "categorySlug": "formation",
        "readingTimeMinutes": 6,
        "publishedAt": "2026-05-12T09:00:00.000Z"
      }
    ],
    "metaTitle": "Understanding U.S. LLC Taxation | ForeMint",
    "metaDescription": "How a U.S. LLC is taxed when you live abroad...",
    "focusKeyword": "us llc taxation",
    "canonicalUrl": null,
    "ogTitle": "Understanding U.S. LLC Taxation | ForeMint",
    "ogDescription": "How a U.S. LLC is taxed when you live abroad...",
    "ogImage": "https://res.cloudinary.com/foremint/image/upload/v1/.../abc.jpg",
    "twitterTitle": "Understanding U.S. LLC Taxation | ForeMint",
    "twitterDescription": "How a U.S. LLC is taxed when you live abroad...",
    "twitterImage": "https://res.cloudinary.com/foremint/image/upload/v1/.../abc.jpg",
    "answerSummary": "A foreign-owned single-member US LLC is a pass-through entity...",
    "primaryEntity": "US LLC",
    "keyTakeaways": [],
    "faqs": [{ "question": "Do I owe US tax?", "answer": "Often $0 if your income is non-ECI..." }],
    "structuredData": {
      "article": { "@context": "https://schema.org", "@type": "Article", "headline": "..." },
      "faq": { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [] },
      "breadcrumb": { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [] }
    }
  }
}
```

### Errors
- `404` → `{ "error": "Post not found" }` (unknown slug, or post is not published yet).
- `500` → `{ "error": "Internal server error" }`.

### How the design maps here
- **“ON THIS PAGE” sidebar** = `post.toc` (array of `{ id, title, level }`). Each `id` matches an `id` attribute already present on the `<h2>`/`<h3>` in `contentHtml`. Build anchor links as `#${entry.id}` and use `level` (2 or 3) for indentation.
- **Article body** = render `post.contentHtml` with `dangerouslySetInnerHTML`. Heading anchors already exist for scroll-spy.
- **Related resources cards** = `post.relatedBlogs` (up to 3; same category first, then most recent).
- **SEO `<head>`** = use `metaTitle`, `metaDescription`, `canonicalUrl`, `ogImage`, etc. Inject **every** `structuredData` value as a `<script type="application/ld+json">` (iterate the object — keys: `article`, `organization`, `author`, optional `faq`, `breadcrumb`).

---

## 4. `GET /api/public/blog-categories` (and alias `/api/public/categories`)

Returns **active**, non-deleted categories ordered by `sortOrder` then `name`, each with a count of published posts.

### Response `200`
```json
{
  "categories": [
    { "id": "c1...", "name": "Taxation", "slug": "taxation", "description": "US tax for founders", "color": "#34088f", "sortOrder": 0, "postCount": 5 },
    { "id": "c2...", "name": "Formation", "slug": "formation", "description": null, "color": "#7c3aed", "sortOrder": 1, "postCount": 3 }
  ]
}
```
Use this for the **filter tabs** (All, Taxation, Formation, Compliance, Banking & Payments). The “All” tab is a frontend concept — omit the `category` param to get all.

---

## 5. `GET /api/public/blog-categories/{slug}` — Category + its posts

Path param: category **`slug`**. Query params: `page` (default 1), `pageSize` (default 10, max 50).

### Response `200`
```json
{
  "category": { "id": "c1...", "name": "Taxation", "slug": "taxation", "description": "US tax for founders", "color": "#34088f", "postCount": 5 },
  "posts": [ /* same card shape as section 2 */ ],
  "total": 5,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```
### Errors
- `404` → `{ "error": "Category not found" }` (unknown/inactive/deleted category).

> You can also drive a category-filtered listing with `/api/public/blogs?category={slug}` — use this one when you additionally want the category’s own metadata in the same call.

---

## 6. `GET /api/public/tags`

### Response `200`
```json
{ "tags": [ { "id": "t1...", "name": "LLC", "slug": "llc" }, { "id": "t2...", "name": "Tax", "slug": "tax" } ] }
```
Tags carry **no** post count. Filter posts by tag via `/api/public/blogs?tag={slug}`.

---

## 6b. Popularity — view tracking, Most read / Popular, Trending

Popularity is **fully automatic**. There is no admin input — the frontend records a
view when a post page loads, and the rankings derive from those views.

### Record a view — `POST /api/public/blogs/{slug}/view`
Call this **once** when a single post page mounts. No body, no auth. Idempotency is
your responsibility on the client if you want to avoid double counts within a session
(e.g. guard with `sessionStorage`); the backend records every call. It is a safe no-op
for unknown/unpublished slugs.

```js
// on the post page, after it mounts:
fetch(`${BASE}/api/public/blogs/${slug}/view`, { method: 'POST', keepalive: true }).catch(() => {});
```
**Response `200`**: `{ "ok": true }` (or `{ "ok": false }` on a no-op/error — never throws an error status). `OPTIONS` is handled for CORS preflight.

### Most read / Popular — `GET /api/public/blogs?sort=popular`
Returns the normal paginated list ordered by `viewCount` desc (ties broken by newest).
Use `pageSize` to get the top N (e.g. `?sort=popular&pageSize=5`).

### Trending — `GET /api/public/blogs/trending`
Posts ranked by **views within a recent window**. Falls back to all-time most-viewed,
then newest, so the list is **never empty** on a fresh site.

| Query param | Type | Default | Notes |
|-------------|------|---------|-------|
| `days` | int ≥ 1 | `7` | Trailing window length. |
| `limit` | int 1–20 | `5` | How many posts to return. |

**Response `200`**: `{ "posts": [ /* same card shape as §2, body fields empty */ ] }`
(ordered by recent view volume; no pagination meta — it's a fixed-size top list).

> **Building the design's “Popular reads” box** (badges MOST READ / TRENDING / ESSENTIAL):
> - **MOST READ** → `GET /blogs?sort=popular&pageSize=1` → `posts[0]`
> - **TRENDING** → `GET /blogs/trending?limit=1` → `posts[0]`
> - **ESSENTIAL** → `GET /blogs?featured=true&pageSize=1` → `posts[0]`
>
> (Or fetch small lists of each and de-duplicate client-side.)

---

## 7. Every Blog Field — meaning, type, nullability

| Field | Type | Nullable | Meaning / Frontend use |
|-------|------|----------|------------------------|
| `id` | string (uuid) | no | **React `key`**. Not used in URLs. |
| `title` | string | no | Card + page `<h1>`. |
| `slug` | string | no | **URL segment** → `/blog/{slug}`. Unique, auto-generated from title, returned by API. |
| `excerpt` | string | no | Card summary + page subtitle + fallback meta description. |
| `featuredImageUrl` | string | **yes** | Cloudinary absolute URL. Hero/card image. Show a gradient placeholder when `null` (the design’s purple `%` block). |
| `featuredImageAlt` | string | yes | `alt` for the featured image. |
| `author` | string | no | Plain author name (e.g. “Foremint Tax Desk”). **There is no author object/avatar/bio** — render initials avatar from the name. |
| `categoryName` | string | yes | **Primary** category label / chip text. |
| `categorySlug` | string | yes | Primary category — link to category page / filter value. |
| `categoryColor` | string (hex) | yes | Primary category chip/accent color. |
| `categories` | `{name,slug,color}[]` | no (may be `[]`) | **All** categories a post belongs to (many-to-many). Render one chip per entry; the first is the primary. Present on list & single. |
| `isFeatured` | boolean | no | Drives the “FEATURED” hero card and the “Essential” badge in Popular reads. |
| `viewCount` | int | no | All-time view count (auto-tracked). Used for “Most read”/“Popular”. Present on list, single, trending. |
| `tags` | `{name, slug}[]` | no (may be `[]`) | Tag chips; link via `?tag={slug}`. |
| `publishedAt` | string (ISO 8601 UTC) | no* | Display date (“Published June 14, 2026”) + sort key. (*Always present for published posts.) |
| `readingTimeMinutes` | int | no | “9 min read”. Auto-computed (200 wpm). Min 1. |
| `wordCount` | int | no | Optional; auto-computed. |
| `content` | string | no | Plain-text fallback only. **Prefer `contentHtml`.** Empty string in list mode. |
| `contentHtml` | string | **yes in list (null), present on single** | Ready-to-render article HTML with heading anchor IDs. Render via `dangerouslySetInnerHTML`. |
| `contentJson` | object (Tiptap doc) | yes | Structured editor JSON. Optional — only if you render without HTML. |
| `toc` | `{id,title,level}[]` | no (may be `[]`) | “On this page” nav. `id` matches a heading `id` in `contentHtml`; `level` ∈ {2,3}. Empty in list mode. |
| `relatedBlogs` | summary[] | no (may be `[]`) | Related cards (see shape below). Empty in list mode. |
| `metaTitle` | string | yes | `<title>`. Defaults to `"{title} | ForeMint"`. |
| `metaDescription` | string | yes | `<meta name="description">`. |
| `focusKeyword` | string | yes | SEO keyword (optional display). |
| `canonicalUrl` | string | yes | `<link rel="canonical">` if present. |
| `ogTitle` / `ogDescription` / `ogImage` | string | yes | Open Graph tags (auto-derived from meta + featured image). |
| `twitterTitle` / `twitterDescription` / `twitterImage` | string | yes | Twitter card tags. |
| `answerSummary` | string | yes | AEO “quick answer” block (optional callout). |
| `primaryEntity` | string | yes | AEO metadata (usually not displayed). |
| `keyTakeaways` | string[] | no (may be `[]`) | Optional bullet list. Usually empty currently. |
| `faqs` | `{question,answer}[]` | no (may be `[]`) | FAQ accordion + FAQ schema. |
| `structuredData` | object | yes | JSON-LD blocks: `article` (with publisher), `organization`, `author`, optional `faq`, `breadcrumb`. Inject each as `<script type="application/ld+json">`. |

### `relatedBlogs[]` / category-post summary shape
`{ id, title, slug, excerpt, featuredImageUrl, featuredImageAlt, categoryName, categorySlug, readingTimeMinutes, publishedAt }`

### `category` object shape (sections 4 & 5)
`{ id, name, slug, description, color, sortOrder?, postCount }`

---

## 8. Slugs, Images, Content, Relationships (quick rules)

- **Slug**: auto-generated from the title, unique, editable in admin, returned by API, and is the **only** identifier used in public URLs. Use `/blog/{slug}`. Do **not** use `id` in URLs.
- **Images**: absolute Cloudinary HTTPS URLs or `null`. Never prepend a base. Inline article images are already inside `contentHtml` as `<figure><img ...><figcaption>…</figcaption></figure>`.
- **Content format**: stored/served as **HTML** (`contentHtml`, source: Tiptap). Render with `dangerouslySetInnerHTML`; style via your prose CSS. Heading IDs for the TOC are already injected.
- **Relationships**: a post **belongs to one or more categories** — all in `categories[]`, with the primary mirrored in `categoryName/Slug/Color` (may be null) — and **has many tags** (`tags[]`). Author is a **string**, not a relation. Related posts come pre-computed in `relatedBlogs` on the single endpoint. There are **no** comments, no media gallery endpoint, no per-author endpoint.

---

## 9. Sorting / Filtering / Search / Auth — summary

- **Sort** (`/blogs?sort=`): `newest` (default), `oldest`, `title`, `popular` (all-time views). Trending (recent-window) has its own endpoint — see §6b.
- **Filter**: `category` (slug), `tag` (slug), `featured=true`. Status is implicit (always published only). A post can belong to **multiple** categories — `?category={slug}` matches any post that includes that category (via the many-to-many junction).
- **Search**: `q=` matches `title` OR `excerpt` (case-insensitive). No full-text body search.
- **Auth**: every public endpoint is open; no headers, no tokens, no roles.

---

## 10. Error responses (public API)
| Status | When | Body |
|--------|------|------|
| `200` | success | data |
| `404` | unknown/unpublished slug, or unknown category | `{ "error": "Post not found" }` / `{ "error": "Category not found" }` |
| `500` | server/db error | `{ "error": "Internal server error" }` (or the underlying message) |

There are **no** `400/401/403/422` on the public API (no auth, params are defensively clamped, not rejected). Always code defensively: check `res.ok`, then read `error`.

---

## 11. Popularity (now provided) + remaining gaps
- **“Popular reads” / “Trending” / “Most read” — SUPPORTED (automatic).** Driven by view tracking (§6b). Most read/Popular = `?sort=popular` (all-time `viewCount`); Trending = `/blogs/trending` (recent window); Essential = `?featured=true`. The frontend must POST `/blogs/{slug}/view` on each post page load for the data to accumulate.
- **No `likes` or `comments`.** Only views are tracked.
- **Newsletter form**: handled entirely on the frontend — not part of this API.
- **SEO** is limited to the meta/OG/Twitter/`structuredData` fields listed in §7 (no separate `robots` field).

---

# FRONTEND IMPLEMENTATION SPECIFICATION

Hand this section to the frontend AI. It is sufficient to integrate without re-reading the backend.

### Config
- Base URL env: `NEXT_PUBLIC_BLOG_API_BASE` = `https://app.foremint.pk` (confirm host). All calls: `` `${BASE}/api/public/...` ``.
- No auth headers. Plain `fetch`. Always `if (!res.ok) handleError()`.

### Routes (frontend)
- Blog index/listing page: `/resources` (or `/blog`).
- Single post page: `/blog/[slug]` → fetch `GET ${BASE}/api/public/blogs/${slug}`.
- Category page (optional): `/blog/category/[slug]` → `GET ${BASE}/api/public/blog-categories/${slug}`.

### Data fetching
- **Listing page**:
  - Featured hero: `GET ${BASE}/api/public/blogs?featured=true&pageSize=1` → use `posts[0]`.
  - Grid: `GET ${BASE}/api/public/blogs?page={page}&pageSize=6&sort=newest` (+ `category`, `tag`, `q` as the user filters).
  - Filter tabs: `GET ${BASE}/api/public/blog-categories` → tabs from `categories[]` (+ a synthetic “All”).
  - Pagination: read `totalPages`/`page`; `hasNext = page < totalPages`, `hasPrev = page > 1`.
  - **Popular reads box** (sidebar): MOST READ → `GET /api/public/blogs?sort=popular&pageSize=1`; TRENDING → `GET /api/public/blogs/trending?limit=1`; ESSENTIAL → `GET /api/public/blogs?featured=true&pageSize=1`. Take `posts[0]` of each.
- **Single page**: `GET ${BASE}/api/public/blogs/${slug}` → `data.post`. On `404`, render not-found. **On mount, fire-and-forget** `POST ${BASE}/api/public/blogs/${slug}/view` (optionally guard once per session) so popularity accrues.

### Field usage (exact)
- **React key**: `id`.
- **URL param**: `slug` (never `id`).
- **Card image / hero**: `featuredImageUrl` (fallback to a gradient block when `null`); `alt` = `featuredImageAlt`.
- **Card meta**: `categoryName` (+ `categoryColor` for the chip), `readingTimeMinutes` (`"{n} min read"`), `publishedAt` (format to “MMM DD, YYYY”), `author` (initials avatar from the string).
- **Card text**: `title`, `excerpt`.
- **Excerpt source**: `excerpt`.
- **Article body**: `contentHtml` via `dangerouslySetInnerHTML`.
- **On-this-page TOC**: `toc[]` → links `#${id}`, indent by `level`.
- **Related cards**: `relatedBlogs[]`.
- **FAQ**: `faqs[]`.
- **SEO**: `metaTitle`, `metaDescription`, `canonicalUrl`, `ogTitle/ogDescription/ogImage`, `twitterTitle/twitterDescription/twitterImage`; inject `structuredData.article` / `.faq` / `.breadcrumb` as separate JSON-LD `<script>` tags.

### Transforms required
- Dates: `publishedAt` is ISO UTC — format for display.
- Reading time: already an int (`readingTimeMinutes`), append `" min read"`.
- Author avatar: derive initials from `author` (no avatar URL exists).
- Featured image null → render the design’s gradient placeholder.
- Listing responses have empty `contentHtml/toc/relatedBlogs` — do not rely on them in cards; fetch the single endpoint for the article page.

### Do NOT
- Do not call any non-`/api/public` route. Do not send auth. Do not use `id` in URLs. Do not invent `likes`/`comments` (only views/popularity exist — §6b). Do not prepend a base URL to image URLs.
