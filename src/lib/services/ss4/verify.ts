import 'server-only';
import * as mupdf from "mupdf";
import {
  askVision,
  explainVisionError,
  parseJsonReply,
  visionStatus,
  type VisionImage,
} from "./vision";

/**
 * Checks the responsible-party name against the member's identity document,
 * the way it was done by hand before this app existed.
 *
 * The order form is not a reliable source for line 7a. Across the book it has
 * carried the wrong case ("Faizan ali" vs the CNIC's "Faizan Ali"), an extra
 * surname ("Aymal Khalid Khan" vs "Aymal Khalid"), and sometimes the account
 * holder instead of the LLC member.
 */
export interface NameVerification {
  /** Name printed on the ID, preserving its spelling and case. */
  idName: string | null;
  source: "id-document" | "operating-agreement" | "order-form" | "cache";
  status: "verified" | "ambiguous" | "unverified";
  note?: string;
}

/** Loose comparison: case, punctuation and spacing differences are not a mismatch. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,'`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_PROMPT = `You are reading a national identity card or passport.

Return ONLY a JSON object, no prose:
{"name":"","documentType":"cnic|passport|other"}

"name" is the card holder's own name, exactly as printed - preserve the spelling
and capitalisation shown. On a Pakistani CNIC this is the "Name" field. On a
passport, combine "Given Names" then "Surname" in natural order (surname last),
so a passport reading Surname AKRAM / Given Names ALI becomes "Ali Akram".

Never return the father's name, the issuing authority, or any other person on
the document. If no holder name is legible, return "".`;

/** Renders an identity document into images a vision model can read. */
async function toImages(url: string): Promise<VisionImage[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download the ID document (HTTP ${response.status}).`);

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const bytes = new Uint8Array(await response.arrayBuffer());

  const isPdf = contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    const doc = mupdf.Document.openDocument(bytes, "application/pdf");
    const out: VisionImage[] = [];
    for (let i = 0; i < Math.min(doc.countPages(), 2); i++) {
      const pm = doc
        .loadPage(i)
        .toPixmap(mupdf.Matrix.scale(1.4, 1.4), mupdf.ColorSpace.DeviceRGB, false, true);
      out.push({ data: Buffer.from(pm.asPNG()).toString("base64"), mediaType: "image/png" });
    }
    return out;
  }

  const mediaType: VisionImage["mediaType"] = contentType.includes("png")
    ? "image/png"
    : contentType.includes("webp")
      ? "image/webp"
      : "image/jpeg";
  return [{ data: Buffer.from(bytes).toString("base64"), mediaType }];
}

/**
 * @param formName  the name on the order form, which is what would otherwise go on line 7a
 * @param idUrl     the member's identity document, or null when none is on file
 */
export async function verifyName(
  formName: string,
  idUrl: string | null
): Promise<NameVerification> {
  if (!idUrl) {
    return {
      idName: null,
      source: "order-form",
      status: "unverified",
      note: "No identity document on file; the name comes from the order form alone.",
    };
  }

  if (!(await visionStatus()).configured) {
    return {
      idName: null,
      source: "order-form",
      status: "unverified",
      note: "No vision provider is configured, so the identity document could not be read. Add the Fazita API key under Admin → EIN → Settings.",
    };
  }

  let raw: string;
  try {
    const reply = await askVision({
      system: NAME_PROMPT,
      prompt: "Read the holder's name from this document.",
      images: await toImages(idUrl),
      maxTokens: 256,
    });
    raw = reply.text;
  } catch (error) {
    // A failed name check must never lose the packet - report and carry on.
    return {
      idName: null,
      source: "order-form",
      status: "unverified",
      note: explainVisionError(error),
    };
  }

  const parsed = parseJsonReply<{ name?: string }>(raw);
  const idName = String(parsed?.name ?? "").trim();

  if (!idName) {
    return {
      idName: null,
      source: "order-form",
      status: "unverified",
      note: "The identity document was read but no holder name was legible.",
    };
  }

  if (normalize(idName) === normalize(formName)) {
    return {
      idName,
      source: "id-document",
      status: "verified",
      note: `Matches the identity document ("${idName}").`,
    };
  }

  // A real difference in wording, not just case or punctuation. The order-form
  // name is kept on the document on purpose - silently rewriting the responsible
  // party on a filed federal form is worse than flagging it for a human.
  return {
    idName,
    source: "id-document",
    status: "ambiguous",
    note: `Identity document reads "${idName}" but the order says "${formName}". The order-form name was used; correct it below if the ID is right.`,
  };
}
