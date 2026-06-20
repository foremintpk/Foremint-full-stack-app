/**
 * CORS allowlist for the public Blog API.
 *
 * Only these browser origins are granted cross-origin access. Server-to-server
 * fetches (SSR/ISR) send no `Origin` header and are unaffected by CORS — this
 * only gates browser requests. Extra origins can be added via the
 * `BLOG_CORS_ORIGINS` env var (comma-separated).
 */

const ENV_ORIGINS = (process.env.BLOG_CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const ALLOWED_ORIGINS = new Set<string>([
  'https://foremint.pk',
  'https://www.foremint.pk',
  'https://foremintfrontend.vercel.app',
  'http://localhost:3000', // local frontend dev
  ...ENV_ORIGINS,
]);

const PRIMARY_ORIGIN = 'https://foremint.pk';

/** Returns the request's Origin if it is allowed, otherwise null. */
export function resolveOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
}

/**
 * CORS response headers. Echoes the caller's origin when allowed (falling back to
 * the primary production origin), and always sets `Vary: Origin` so CDN/browser
 * caches never serve one origin's `Access-Control-Allow-Origin` to another.
 */
export function corsHeaders(request: Request, extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(request) ?? PRIMARY_ORIGIN,
    Vary: 'Origin',
    ...extra,
  };
}

/** Standard 204 preflight response for the allowed origin. */
export function corsPreflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }),
  });
}
