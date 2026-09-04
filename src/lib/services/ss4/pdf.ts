import 'server-only';
import { PDFDict, PDFDocument, PDFName, PDFRef, StandardFonts, rgb } from "pdf-lib";
import type { SS4FormData } from "./types";
import { isoToLongDate } from "./format";

/**
 * AcroForm field names of the official SS-4 template (Rev. 12-2025).
 * All static values (LLC checkboxes, entity type, designee info, etc.)
 * are already present in the template and are left untouched.
 */
const prefix = "topmostSubform[0].Page1[0]";
const FIELDS = {
  legalName: `${prefix}.f1_2[0]`, // line 1
  tradeName: `${prefix}.f1_3[0]`, // line 2
  mailingAddress: `${prefix}.Line4ReadOrder[0].f1_5[0]`, // line 4a
  mailingCityStateZip: `${prefix}.Line4ReadOrder[0].f1_6[0]`, // line 4b
  countyAndState: `${prefix}.f1_9[0]`, // line 6
  responsibleParty: `${prefix}.f1_10[0]`, // line 7a
  businessStartDate: `${prefix}.f1_31[0]`, // line 11
  activityOtherCheckbox: `${prefix}.c1_6[11]`, // line 16 "Other (specify)"
  activityOtherText: `${prefix}.f1_37[0]`, // line 16 specify text
  merchandiseDescription: `${prefix}.f1_38[0]`, // line 17
  nameAndTitle: `${prefix}.f1_44[0]`, // signature block name/title
} as const;

/** Placement of the drawn signature image and date, measured from the reference PDF (PDF points, origin bottom-left). */
const SIGNATURE_BOX = { x: 80, y: 38, maxWidth: 230, maxHeight: 26 };
const DATE_TEXT = { x: 349, y: 39, size: 11 };

/**
 * The template stores checkbox appearances as an indirect reference to a
 * state dictionary ({"/1": stream}); pdf-lib only handles state dictionaries
 * held directly in /N, so checked boxes would flatten to an invalid XObject
 * and lose their check marks. Inline the referenced dictionary so pdf-lib can
 * resolve both the on-value and the current appearance stream.
 */
function resolveAppearanceStates(doc: PDFDocument): void {
  for (const field of doc.getForm().getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      const appearances = widget.dict.lookupMaybe(PDFName.of("AP"), PDFDict);
      if (!appearances || !(appearances.get(PDFName.of("N")) instanceof PDFRef)) continue;
      const normal = appearances.lookup(PDFName.of("N"));
      if (normal instanceof PDFDict) appearances.set(PDFName.of("N"), normal);
    }
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Fills the SS-4 template with the form data, draws the signature PNG and
 * signature date, and returns a new flattened PDF. The template on disk is
 * never modified.
 */
export async function fillSS4Pdf(
  form: SS4FormData,
  signaturePng: string,
  templateBytes: Uint8Array
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const acroForm = doc.getForm();

  const setText = (field: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) acroForm.getTextField(field).setText(trimmed);
  };

  setText(FIELDS.legalName, form.companyName);
  setText(FIELDS.tradeName, form.tradeName);
  setText(FIELDS.mailingAddress, form.mailingAddress);
  setText(FIELDS.mailingCityStateZip, `${form.city} ${form.state} ${form.zip}`);
  setText(FIELDS.countyAndState, `${form.county} ${form.state}`);
  setText(FIELDS.responsibleParty, form.responsibleName);
  setText(FIELDS.businessStartDate, isoToLongDate(form.businessStartDate));
  acroForm.getCheckBox(FIELDS.activityOtherCheckbox).check();
  setText(FIELDS.activityOtherText, form.businessActivity);
  setText(FIELDS.merchandiseDescription, form.businessDescription);
  setText(FIELDS.nameAndTitle, `${form.responsibleName} (Member)`);

  const page = doc.getPage(0);

  const signature = await doc.embedPng(dataUrlToBytes(signaturePng));
  const scale = Math.min(
    SIGNATURE_BOX.maxWidth / signature.width,
    SIGNATURE_BOX.maxHeight / signature.height
  );
  page.drawImage(signature, {
    x: SIGNATURE_BOX.x,
    y: SIGNATURE_BOX.y,
    width: signature.width * scale,
    height: signature.height * scale,
  });

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(form.signatureDate, {
    x: DATE_TEXT.x,
    y: DATE_TEXT.y,
    size: DATE_TEXT.size,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  resolveAppearanceStates(doc);
  acroForm.flatten();
  return doc.save();
}
