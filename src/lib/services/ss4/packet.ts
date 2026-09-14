import { PDFDocument } from "pdf-lib";
import { fillSS4Pdf } from "./pdf";
import { formatLongDate } from "./format";
import type { SS4FormData } from "./types";
import { generateSignaturePng } from "./signature";
import { buildTemplate } from "./template";
import type { Extraction } from "./extract";

/** Line 16 and line 17 both carry this, on every SS-4 in the batch. */
const ANY_LEGAL_BUSINESS = "Any legal Business";

export interface PacketInput {
  orderNumber: string;
  responsibleName: string;
  members: number;
  /** 1 = first submission (no banner); 2+ stamps the attempt banner. */
  attempt: number;
  extraction: Extraction;
  /** Articles PDF, appended after the SS-4. */
  articlesUrl: string;
}

export interface Packet {
  fileName: string;
  /** The SS-4 followed by the Articles, as one PDF. */
  bytes: Uint8Array;
  pages: number;
  articlesPages: number;
}

/**
 * Fields that must be present before anything is put on a filed federal form.
 * fillSS4Pdf skips empty strings silently, so without this check a document
 * with no mailing address still produces a clean-looking PDF - lines 4a, 4b and
 * 6 simply come out blank. Texas Certificates of Formation have no
 * mailing-address section at all, which is exactly how that happens.
 */
const REQUIRED: { key: keyof Extraction; label: string }[] = [
  { key: "companyName", label: "legal name" },
  { key: "formationDate", label: "formation date" },
  { key: "mailingAddress", label: "mailing address (line 4a)" },
  { key: "city", label: "city (line 4b / county line 6)" },
  { key: "state", label: "state" },
  { key: "zip", label: "ZIP" },
];

export async function buildPacket(input: PacketInput): Promise<Packet> {
  const { extraction: x } = input;

  const missing = REQUIRED.filter(({ key }) => !String(x[key] ?? "").trim());
  if (missing.length > 0) {
    throw new Error(
      `Cannot build this SS-4: the filing gave no ${missing.map((m) => m.label).join(", ")}. ` +
        "Texas Certificates of Formation carry no mailing-address section - use the " +
        "instructions box to supply the governing-person address for this order."
    );
  }

  const form: SS4FormData = {
    companyName: x.companyName,
    // The order form's "secondary business name" is a backup formation name,
    // not a DBA, so line 2 is deliberately left empty.
    tradeName: "",
    mailingAddress: x.mailingAddress,
    city: x.city,
    state: x.state,
    zip: x.zip,
    // Line 6 carries the mailing address's city, not the true county.
    county: x.city,
    responsibleName: input.responsibleName,
    businessStartDate: x.formationDate,
    businessActivity: ANY_LEGAL_BUSINESS,
    businessDescription: ANY_LEGAL_BUSINESS,
    signatureDate: formatLongDate(new Date()),
  };

  const template = await buildTemplate(input.attempt, input.members);
  const signature = await generateSignaturePng(input.responsibleName);
  const ss4 = await fillSS4Pdf(form, signature, template);

  const packet = await PDFDocument.load(ss4);
  let articlesPages = 0;

  try {
    const response = await fetch(input.articlesUrl);
    if (response.ok) {
      const articles = await PDFDocument.load(await response.arrayBuffer());
      const copied = await packet.copyPages(articles, articles.getPageIndices());
      for (const page of copied) packet.addPage(page);
      articlesPages = copied.length;
    }
  } catch {
    // A packet without its Articles is still worth delivering; the caller
    // surfaces articlesPages === 0 as a warning in the results table.
  }

  const bytes = await packet.save();
  return {
    fileName: `${input.orderNumber} - ${x.companyName} - SS4 + Articles.pdf`,
    bytes,
    pages: packet.getPageCount(),
    articlesPages,
  };
}
