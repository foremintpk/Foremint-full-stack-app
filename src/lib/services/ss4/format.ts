const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Formats a date as "June 2, 2026". Never numeric. */
export function formatLongDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Converts an ISO date string (yyyy-mm-dd) to "June 2, 2026" without timezone drift. */
export function isoToLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return formatLongDate(new Date(y, m - 1, d));
}

/** Matches the required long date format, e.g. "June 2, 2026". */
export const LONG_DATE_PATTERN = new RegExp(`^(${MONTHS.join("|")}) \\d{1,2}, \\d{4}$`);

/** Builds a download filename like "Alfa Nest LLC July 6, 2026.pdf". */
export function buildPdfFilename(companyName: string, longDate: string): string {
  const base = `${companyName} ${longDate}`
    .replace(/[\\/:*?"<>|]/g, "") // strip characters invalid in filenames
    .replace(/\s+/g, " ")
    .trim();
  return `${base || "SS-4"}.pdf`;
}

/** Strips characters illegal in filenames and collapses whitespace. */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ensures a filename ends in ".pdf" (case-insensitive), with a safe fallback. */
export function ensurePdfExtension(name: string, fallback = "document"): string {
  const base = sanitizeFilename(name).replace(/\.pdf$/i, "").trim();
  return `${base || fallback}.pdf`;
}

export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
