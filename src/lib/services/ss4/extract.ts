import 'server-only';
import * as mupdf from "mupdf";
import { DEFAULT_INSTRUCTIONS } from "./instructions";
import {
  askVision,
  explainVisionError,
  parseJsonReply,
  visionStatus,
  type VisionImage,
} from "./vision";

/** Everything the SS-4 needs that only the filed Articles can tell us. */
export interface Extraction {
  /** Entity name exactly as filed. */
  companyName: string;
  /** Formation date from the filing stamp, ISO yyyy-mm-dd. */
  formationDate: string;
  /**
   * The state's own identifier for the filing, exactly as printed. Labelled
   * differently per state — "Original ID" (WY), "File Number" (MT), "Document
   * Number" (FL) — and formats differ too: WY is 2026-002051376, MT 17270670.
   * Empty when the filing does not show one.
   */
  filingId: string;
  mailingAddress: string;
  city: string;
  state: string;
  zip: string;
  /** How it was read - shown in the UI so a model read can be spot-checked. */
  source: "text-layer" | "vision" | "cache";
  /** Which provider read it, when source is "vision". */
  provider?: string;
  /** Set when something could not be resolved and needs a human. */
  warning?: string;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function iso(y: string | number, m: string, d: string | number): string {
  return `${y}-${m}-${String(d).padStart(2, "0")}`;
}

/** Handles "Aug  2 2026", "8/4/2026", "August 6, 2026". */
function parseDate(raw: string): string | null {
  let m = raw.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const mm = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mm) return iso(m[3], mm, m[2]);
  }
  m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return iso(m[3], String(m[1]).padStart(2, "0"), m[2]);
  return null;
}

/**
 * Trims a filing identifier to the number the state actually records.
 *
 * Montana's certification letter prints a compound "C1650701 - 17270670"; only
 * the second half appears on the filed Articles and in the state's register.
 * A plain identifier — "2026-002049006", "17270670" — is left untouched, since
 * Wyoming's own format legitimately contains a hyphen.
 */
function normalizeFilingId(raw: string): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";

  // Montana's compound form is "<letter-prefixed code> - <file number>", with
  // or without spaces around the hyphen. Wyoming's own "2026-002049006" must
  // survive intact, so the split requires the FIRST part to start with a letter
  // — which Wyoming's never does.
  const compound = value.match(/^([A-Za-z]\w*)\s*-\s*(.+)$/);
  if (compound) return compound[2].trim();

  return value;
}

/** Splits "Sheridan, Wyoming 82801" into its parts. */
function splitCityStateZip(line: string) {
  const m = line.match(/^\s*(.+?),?\s+(WY|Wyoming|MT|Montana|TX|Texas|FL|Florida|KY|Kentucky)\.?,?\s+(\d{5}(?:-\d{4})?)/i);
  if (!m) return null;
  const state = m[2].slice(0, 2).toUpperCase();
  return { city: m[1].replace(/,$/, "").trim(), state, zip: m[3] };
}

/**
 * Reads a Wyoming-style Articles of Organization from its text layer. WY is the
 * bulk of the book and has a stable layout: the mailing address is the second
 * of the three address blocks that follow the numbered headings.
 */
function parseTextLayer(text: string): Extraction | null {
  const filed = text.match(/FILED:\s*([A-Za-z]{3,9}\s+\d{1,2}\s+\d{4})/)
    ?? text.match(/Date Filed:\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
    ?? text.match(/Received and Filed\s*(\d{1,2}\/\d{1,2}\/\d{4})/)
    ?? text.match(/Filed Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  const formationDate = filed ? parseDate(filed[1]) : null;

  // The state's filing identifier, however that state labels it. Matched in
  // order of specificity so a document carrying several numbers yields the
  // filing's own, not a registered agent or amendment reference.
  const filingMatch =
    text.match(/Original ID:\s*([A-Za-z0-9-]+)/i)
    ?? text.match(/File Number:\s*([A-Za-z0-9-]+)/i)
    ?? text.match(/Document Number:\s*([A-Za-z0-9-]+)/i)
    ?? text.match(/Filing Number:\s*([A-Za-z0-9-]+)/i)
    // "Certified File Number: C1650701 - 17270670" (MT). Captured whole so
    // normalizeFilingId can drop the prefix; capturing only the tail here would
    // depend on the spacing the document happens to use.
    ?? text.match(/Certified File Number:\s*([A-Za-z0-9][A-Za-z0-9\s-]*?)\s*$/im)
    ?? text.match(/\bID Number:\s*([A-Za-z0-9-]+)/i);
  const filingId = normalizeFilingId(filingMatch?.[1] ?? "");

  const nameMatch = text.match(/Articles of Organization\s*\n\s*(.+?)\s*\n/)
    ?? text.match(/Entity Name\s*\n\s*(.+?)\s*\n/);
  const companyName = nameMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";

  // Address blocks: a street line followed by a city/state/zip line.
  const blocks: { street: string; csz: ReturnType<typeof splitCityStateZip> }[] = [];
  const lines = text.split("\n").map((l) => l.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\d{2,6}\s+[A-Za-z]/.test(lines[i])) {
      const csz = splitCityStateZip(lines[i + 1]);
      if (csz) blocks.push({ street: lines[i].replace(/\s{2,}/g, " "), csz });
    }
  }

  // WY/MT list registered agent first, then the LLC's mailing address.
  const pick = blocks.length >= 2 ? blocks[1] : blocks[0];

  if (!formationDate || !companyName || !pick?.csz) return null;
  return {
    companyName,
    formationDate,
    filingId,
    mailingAddress: pick.street,
    city: pick.csz.city,
    state: pick.csz.state,
    zip: pick.csz.zip,
    source: "text-layer",
  };
}

/**
 * Renders the leading pages so a vision model can read a scan.
 *
 * Texas filings put a cover certificate first and the Certificate of Formation
 * - which carries the governing-person address - on page 3. A 2-page window
 * missed it entirely and every Texas order came back with no address at all.
 */
function renderPages(pdf: Uint8Array, max = 4): VisionImage[] {
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  const out: VisionImage[] = [];
  for (let i = 0; i < Math.min(doc.countPages(), max); i++) {
    const pm = doc
      .loadPage(i)
      .toPixmap(mupdf.Matrix.scale(1.6, 1.6), mupdf.ColorSpace.DeviceRGB, false, true);
    out.push({ data: Buffer.from(pm.asPNG()).toString("base64"), mediaType: "image/png" });
  }
  return out;
}

function plainText(pdf: Uint8Array): string {
  const doc = mupdf.Document.openDocument(pdf, "application/pdf");
  let text = "";
  for (let i = 0; i < doc.countPages(); i++) {
    text += "\n" + doc.loadPage(i).toStructuredText("preserve-whitespace").asText();
  }
  return text;
}

const SCHEMA_HINT = `Reply with ONLY a JSON object, no prose:
{"companyName":"","formationDate":"YYYY-MM-DD","filingId":"","mailingAddress":"","city":"","state":"XX","zip":""}
filingId is the state's own identifier for this filing, copied exactly as
printed. States label it differently: "Original ID" (Wyoming), "File Number"
(Montana), "Document Number" (Florida), "Certified File Number". Take the
filing's own number, never the registered agent's or an amendment reference.
mailingAddress is the street line only; city/state/zip are separate.
If a value genuinely is not on the document, use "".`;

async function parseWithVision(pdf: Uint8Array, extra: string): Promise<Extraction> {
  if (!(await visionStatus()).configured) {
    throw new Error(
      "This Articles PDF has no text layer and no vision provider is configured. " +
        "Add the Anthropic API key under Admin → EIN → Settings, or supply this order's address in the instructions box."
    );
  }

  let raw: string;
  let provider: string;
  try {
    const reply = await askVision({
      system: `${DEFAULT_INSTRUCTIONS}

${extra}

${SCHEMA_HINT}`,
      prompt:
        "Read this filed Articles of Organization and return the JSON described in the system prompt.",
      images: renderPages(pdf),
    });
    raw = reply.text;
    provider = reply.provider;
  } catch (error) {
    throw new Error(explainVisionError(error));
  }

  const parsed = parseJsonReply<Partial<Extraction>>(raw);
  if (!parsed) {
    throw new Error(
      `The model did not return readable JSON for this Articles PDF. Raw reply began: ${raw.slice(0, 120).replace(/\s+/g, " ")}`
    );
  }

  const missing = (["companyName", "formationDate", "mailingAddress", "city", "state", "zip"] as const)
    .filter((k) => !String(parsed[k] ?? "").trim());

  return {
    companyName: parsed.companyName ?? "",
    formationDate: parsed.formationDate ?? "",
    // Montana prints "Certified File Number: C1650701 - 17270670"; the second
    // half is the number that also appears on the filed Articles and is what
    // gets recorded. Keep a single-token id exactly as read.
    filingId: normalizeFilingId(parsed.filingId ?? ""),
    mailingAddress: parsed.mailingAddress ?? "",
    city: parsed.city ?? "",
    state: (parsed.state ?? "").toUpperCase(),
    zip: parsed.zip ?? "",
    source: "vision",
    provider,
    warning: missing.length ? `Not found on the document: ${missing.join(", ")}` : undefined,
  };
}

/**
 * Reads an Articles of Organization. Text-layer filings are parsed locally for
 * free; only what that cannot resolve is sent to a vision model.
 */

/**
 * Applies "FM-01159 address: 5900 Balcones Drive # 32512, Austin, TX 78731"
 * from the instructions box. Some filings - Texas especially - simply do not
 * carry a mailing address, so a human has to supply it.
 */
export function applyAddressOverride(
  extraction: Extraction,
  orderNumber: string,
  instructions: string
): Extraction {
  // Escape the order number so "FM-01159" cannot act as a character range.
  const escaped = orderNumber.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
  // "FM-01159: <addr>", "FM-01159 address: <addr>", "FM-01159 address = <addr>".
  // The separator is required so a passing mention of the order number in prose
  // is not mistaken for an address.
  const pattern = new RegExp(
    escaped + "[ \\t]*(?:address)?[ \\t]*[:=][ \\t]*(.+?)[ \\t]*(?:\\r?\\n|$)",
    "i"
  );
  const line = instructions.match(pattern)?.[1];
  if (!line) return extraction;

  // "<street>, <city>, <ST> <zip>"
  const parts = line.match(/^(.*),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (!parts) return extraction;

  return {
    ...extraction,
    mailingAddress: parts[1].trim(),
    city: parts[2].trim(),
    state: parts[3].toUpperCase(),
    zip: parts[4],
    warning: undefined,
    source: extraction.source,
  };
}

export async function extractArticles(url: string, extraInstructions = ""): Promise<Extraction> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download the Articles PDF (HTTP ${response.status}).`);
  const pdf = new Uint8Array(await response.arrayBuffer());

  const text = plainText(pdf);
  if (text.trim().length > 50) {
    const parsed = parseTextLayer(text);
    if (parsed) return parsed;
  }
  return await parseWithVision(pdf, extraInstructions);
}
