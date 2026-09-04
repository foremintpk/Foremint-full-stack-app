/**
 * @file src/lib/services/ss4/extractEinLetter.ts
 * @description Reads an IRS EIN notice (CP575 or LTR 147C) for the EIN, the
 * legal name as the IRS holds it, the address, and the member type.
 *
 * WHY THIS IS SEPARATE FROM extract.ts. The Articles of Organization carry the
 * formation date, filing ID and mailing address; they never carry the EIN,
 * because the EIN is issued afterwards by the IRS. The two documents answer
 * different questions and are read by different code.
 *
 * WHY VISION IS USUALLY REQUIRED. EIN letters arrive as faxes — scanned images
 * with no text layer. The local text pass is still tried first, because a
 * letter that was saved rather than faxed costs nothing to read.
 *
 * "SOLE MBR" on the addressee line is the IRS's own marker for a single-member
 * LLC, and is the most reliable member-type signal available anywhere in the
 * document set.
 */

import 'server-only';
import * as mupdf from 'mupdf';
import { askVision, explainVisionError, parseJsonReply, visionStatus, type VisionImage } from './vision';

export interface EinExtraction {
  /** Formatted XX-XXXXXXX. */
  ein: string;
  /** Entity name exactly as the IRS prints it. */
  legalName: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  /** From "SOLE MBR" and similar markers on the addressee line. */
  memberType: 'single' | 'multi' | 'unknown';
  /** The person named alongside the entity, when the letter names one. */
  responsibleName: string;
  source: 'text-layer' | 'vision' | 'cache';
  provider?: string;
  /** Set when something could not be resolved and needs a human. */
  warning?: string;
}

/** An EIN is nine digits, conventionally written XX-XXXXXXX. */
const EIN_PATTERN = /\b(\d{2})-?(\d{7})\b/;

/** Normalises to the canonical XX-XXXXXXX form, or null if not a valid EIN. */
export function normalizeEin(raw: string): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length !== 9) return null;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

const SYSTEM_PROMPT = `You are reading an IRS EIN notice (Notice CP575, or Letter 147C).

Return ONLY a JSON object, no prose:
{"ein":"XX-XXXXXXX","legalName":"","addressLine":"","city":"","state":"XX","zip":"","memberType":"single|multi|unknown","responsibleName":""}

- "ein" is the Employer Identification Number, formatted XX-XXXXXXX. It appears
  as "Employer Identification Number:" or "Your EIN is".
- "legalName" is the entity name exactly as the IRS prints it, usually the first
  line of the addressee block.
- "addressLine" is the street line only; city, state and zip are separate.
- "memberType": the IRS prints "SOLE MBR" after the person's name for a
  single-member LLC. "MBR", "PTR" or several named members indicate multi.
  Use "unknown" when the document does not say.
- "responsibleName" is the person named on the addressee block, without the
  "SOLE MBR" suffix. Empty if no person is named.
If a value is genuinely absent from the document, use "".`;

/** Reads what can be read from a text layer, when the letter has one. */
function parseTextLayer(text: string): EinExtraction | null {
  const einMatch = text.match(/Employer Identification Number:?\s*(\d{2}-?\d{7})/i)
    ?? text.match(/your EIN is\s*(\d{2}-?\d{7})/i)
    ?? text.match(EIN_PATTERN);
  if (!einMatch) return null;

  const ein = normalizeEin(einMatch[0]);
  if (!ein) return null;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // The addressee block sits above the EIN line; the entity name is the line
  // ending in a company suffix.
  const nameLine = lines.find((l) => /\b(LLC|L\.L\.C|INC|CORP|CO|LTD)\b\.?$/i.test(l)) ?? '';
  const soleLine = lines.find((l) => /\bSOLE\s+MBR\b/i.test(l));

  return {
    ein,
    legalName: nameLine.trim(),
    addressLine: '',
    city: '',
    state: '',
    zip: '',
    memberType: soleLine ? 'single' : 'unknown',
    responsibleName: soleLine ? soleLine.replace(/\s*SOLE\s+MBR\s*/i, '').trim() : '',
    source: 'text-layer',
    // A text-layer read gives the EIN reliably but rarely the full address, so
    // the caller is told the read was partial rather than assuming it complete.
    warning: 'Address not parsed from the text layer.',
  };
}

/** Renders the leading pages for a vision read. */
function renderPages(pdf: Uint8Array, max = 3): VisionImage[] {
  const doc = mupdf.Document.openDocument(pdf, 'application/pdf');
  const out: VisionImage[] = [];
  for (let i = 0; i < Math.min(doc.countPages(), max); i++) {
    const pm = doc
      .loadPage(i)
      .toPixmap(mupdf.Matrix.scale(1.8, 1.8), mupdf.ColorSpace.DeviceRGB, false, true);
    out.push({ data: Buffer.from(pm.asPNG()).toString('base64'), mediaType: 'image/png' });
  }
  return out;
}

function plainText(pdf: Uint8Array): string {
  const doc = mupdf.Document.openDocument(pdf, 'application/pdf');
  let text = '';
  for (let i = 0; i < doc.countPages(); i++) {
    text += '\n' + doc.loadPage(i).toStructuredText('preserve-whitespace').asText();
  }
  return text;
}

/**
 * Reads an IRS EIN notice.
 *
 * @param url the stored EIN letter (PDF or image)
 * @throws when the document cannot be downloaded, or no vision provider is
 *         configured for a scan that needs one
 */
export async function extractEinLetter(url: string): Promise<EinExtraction> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download the EIN letter (HTTP ${response.status}).`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  const isPdf = contentType.includes('pdf') || url.toLowerCase().endsWith('.pdf');

  // --- Free path: a letter that was saved rather than faxed ----------------
  if (isPdf) {
    try {
      const text = plainText(bytes);
      if (text.trim().length > 50) {
        const parsed = parseTextLayer(text);
        // Only accept a text-layer read that produced a valid EIN; otherwise
        // fall through to vision rather than returning a half-empty record.
        if (parsed?.ein) return parsed;
      }
    } catch {
      // A malformed PDF is not fatal here — vision may still read the image.
    }
  }

  // --- Vision path ---------------------------------------------------------
  const status = await visionStatus();
  if (!status.configured) {
    throw new Error(
      'This EIN letter is a scan and no vision provider is configured. ' +
        'Add the API key under Admin → EIN → Settings, or enter the EIN manually.'
    );
  }

  let images: VisionImage[];
  if (isPdf) {
    images = renderPages(bytes);
  } else {
    const mediaType: VisionImage['mediaType'] = contentType.includes('png')
      ? 'image/png'
      : contentType.includes('webp')
        ? 'image/webp'
        : 'image/jpeg';
    images = [{ data: Buffer.from(bytes).toString('base64'), mediaType }];
  }

  if (images.length === 0) {
    throw new Error('The EIN letter appears to have no readable pages.');
  }

  let raw: string;
  let provider: string;
  try {
    const reply = await askVision({
      system: SYSTEM_PROMPT,
      prompt: 'Read this IRS EIN notice and return the JSON described in the system prompt.',
      images,
      maxTokens: 512,
    });
    raw = reply.text;
    provider = reply.provider;
  } catch (error) {
    throw new Error(explainVisionError(error));
  }

  const parsed = parseJsonReply<Partial<EinExtraction>>(raw);
  if (!parsed) {
    throw new Error(
      `The model did not return readable JSON for this EIN letter. Reply began: ${raw.slice(0, 120).replace(/\s+/g, ' ')}`
    );
  }

  // The EIN is the one field that must be structurally valid — it goes onto
  // federal filings, so a malformed value is rejected rather than stored.
  const ein = normalizeEin(String(parsed.ein ?? ''));
  if (!ein) {
    throw new Error(
      `No valid EIN found in this letter (read: "${String(parsed.ein ?? '').slice(0, 40)}"). Check the document.`
    );
  }

  const memberType =
    parsed.memberType === 'single' || parsed.memberType === 'multi' ? parsed.memberType : 'unknown';

  const missing = (['legalName', 'addressLine', 'city', 'state', 'zip'] as const).filter(
    (k) => !String(parsed[k] ?? '').trim()
  );

  return {
    ein,
    legalName: String(parsed.legalName ?? '').trim(),
    addressLine: String(parsed.addressLine ?? '').trim(),
    city: String(parsed.city ?? '').trim(),
    state: String(parsed.state ?? '').trim().toUpperCase(),
    zip: String(parsed.zip ?? '').trim(),
    memberType,
    responsibleName: String(parsed.responsibleName ?? '').trim(),
    source: 'vision',
    provider,
    warning: missing.length ? `Not found on the document: ${missing.join(', ')}` : undefined,
  };
}
