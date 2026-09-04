import 'server-only';
/**
 * Renders the ForeMint invoice with pdf-lib.
 *
 * Geometry, colours and baselines below were measured off the original
 * "Mr. Qaiser - WY Company Formation - Invoice 2739.pdf" so the output lines up
 * with the design that was already going out to clients. All coordinates in
 * this file are TOP-DOWN (y grows downward, like the design tool); `at()`
 * flips them into pdf-lib's bottom-up space at the moment of drawing.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, PDFFont, PDFPage, rgb, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

import {
  BANK_BLOCKS,
  COMPANY,
  COMPLIANCE_BLOCKS,
  COMPLIANCE_TITLE,
  COMPLIANCE_TITLE_ACCENT,
  HEADLINE,
  HEADLINE_ACCENT,
  PAGE1_FOOTER,
  PAGE2_FOOTER,
  THANK_YOU,
  THANK_YOU_ACCENT,
} from './config';
import {
  buildLineItems,
  computeTotals,
  discountNote,
  expand,
  findState,
  itinTermsApply,
  mainTermsApply,
  resolveServiceType,
  findStatusLabel,
  fmtLong,
  fmtShort,
  formatInvoiceDate,
  type InvoiceInput,
} from './invoice';

/* ------------------------------------------------------------------ page */

const W = 595.5;
const H = 842.25;
/** top-down y -> pdf-lib bottom-up y */
const at = (topY: number) => H - topY;

/* ---------------------------------------------------------------- colours */

const PURPLE = rgb(0x33 / 255, 0x08 / 255, 0x8f / 255); // brand
const INK    = rgb(0x21 / 255, 0x24 / 255, 0x36 / 255); // headings / values
const BLACK  = rgb(0, 0, 0);                            // body copy
const GREY   = rgb(0x53 / 255, 0x53 / 255, 0x53 / 255); // header address lines
const WHITE  = rgb(1, 1, 1);
const RED    = rgb(0xff / 255, 0x31 / 255, 0x31 / 255); // footer note
const GREEN  = rgb(0x1f / 255, 0xa8 / 255, 0x55 / 255); // page 2 tick

/* ------------------------------------------------------------------ sizes */

const SIZE = {
  headerAddress: 8,
  headline: 24,
  invoiceToLabel: 10.5,
  customerName: 12,
  metaLabel: 9.5,
  metaValue: 8.5,
  statusTitle: 12,
  statusValue: 13,
  tableHead: 11,
  tableRow: 9.5,
  totals: 9.5,
  thankYou: 18,
  sectionTitle: 9.5,
  body: 8.5,
  footer: 8.5,
  page2Title: 22,
  page2Body: 11,
};

/* --------------------------------------------------------------- geometry */

const MARGIN_L = 30;
const MARGIN_R = 30.5;
const CONTENT_W = W - MARGIN_L - MARGIN_R;

const LOGO = { x: 214.75, top: 28.5, w: 165.25, h: 38 };

/** The two tracked (letter-spaced) header lines, fitted to these widths. */
const HEADER_LINES = [
  { baseline: 90, targetWidth: 459 },
  { baseline: 103, targetWidth: 366 },
];

const META_LABEL_X = 163;
const META_VALUE_X = 260;
const META_ROWS = [189, 207, 227, 245]; // baselines: date, no, service, by

const STATUS = {
  x: 434.09,
  w: 135.29,
  topBoxTop: 179.27,
  topBoxH: 39.37,
  bottomBoxTop: 218.96,
  bottomBoxH: 29.25,
};

const TABLE = {
  headBaseline: 306,
  firstRowBaseline: 338,
  rowHeight: 20,
  descX: MARGIN_L,
  descMaxW: 292,
  qtyCenter: 348.5,
  rateCenter: 418,
  amountCenter: 527.5,
};

const TOTALS_BOX = {
  x: 30.24,
  w: 538.76,
  minTop: 366.67,
  h: 97.41,
  labelX: 405,
  valueX: 516,
  rowOffsets: [20.5, 40.5, 60.5, 80.5], // baselines relative to the box top
};

const FOOTER_RULE_Y = 822.1;
const FOOTER_BASELINE = 835;

/** Nothing is drawn below this on any page. */
const CONTENT_LIMIT = FOOTER_RULE_Y - 12;
/** First baseline on a continuation page, clear of the logo/address header. */
const CONTINUATION_TOP = 150;

/* ------------------------------------------------------------------ fonts */

type Fonts = {
  regular: PDFFont;
  semibold: PDFFont;
  bold: PDFFont;
};

async function loadAssets(doc: PDFDocument) {
  const dir = path.join(process.cwd(), 'public');
  const read = (p: string) => fs.readFile(path.join(dir, p));
  const [reg, semi, bold, logo] = await Promise.all([
    read('fonts/Poppins-Regular.ttf'),
    read('fonts/Poppins-SemiBold.ttf'),
    read('fonts/Poppins-Bold.ttf'),
    read('brand/foremint-logo.png'),
  ]);
  const fonts: Fonts = {
    regular: await doc.embedFont(reg, { subset: true }),
    semibold: await doc.embedFont(semi, { subset: true }),
    bold: await doc.embedFont(bold, { subset: true }),
  };
  return { fonts, logo: await doc.embedPng(logo) };
}

/* ------------------------------------------------------------- text tools */

type TextOpts = { size: number; font: PDFFont; color: RGB };

const widthOf = (text: string, o: TextOpts) => o.font.widthOfTextAtSize(text, o.size);

function drawText(page: PDFPage, text: string, x: number, baseline: number, o: TextOpts) {
  page.drawText(text, { x, y: at(baseline), size: o.size, font: o.font, color: o.color });
}

function drawCentered(page: PDFPage, text: string, centerX: number, baseline: number, o: TextOpts) {
  drawText(page, text, centerX - widthOf(text, o) / 2, baseline, o);
}

function drawRight(page: PDFPage, text: string, rightX: number, baseline: number, o: TextOpts) {
  drawText(page, text, rightX - widthOf(text, o), baseline, o);
}

/**
 * Draws a single line that must not run into whatever sits beside it: shrinks
 * the type down to `minSize`, then truncates with an ellipsis. Used for the
 * customer name and the meta values, which are free text of any length.
 */
function drawFitted(
  page: PDFPage,
  text: string,
  x: number,
  baseline: number,
  maxWidth: number,
  o: TextOpts,
  minSize = 7,
) {
  let opts = o;
  while (widthOf(text, opts) > maxWidth && opts.size > minSize) {
    opts = { ...opts, size: opts.size - 0.25 };
  }
  if (widthOf(text, opts) <= maxWidth) {
    drawText(page, text, x, baseline, opts);
    return;
  }
  let clipped = text;
  while (clipped.length > 1 && widthOf(`${clipped}…`, opts) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  drawText(page, `${clipped}…`, x, baseline, opts);
}

/**
 * Two-tone line: `accent` is printed in the accent colour, the remainder in the
 * base colour, and the pair is centred (or left-aligned) as one unit.
 */
function drawAccented(
  page: PDFPage,
  full: string,
  accent: string,
  o: TextOpts,
  accentColor: RGB,
  opts: { x?: number; centerX?: number; baseline: number },
) {
  const idx = full.indexOf(accent);
  const total = widthOf(full, o);
  let x = opts.centerX !== undefined ? opts.centerX - total / 2 : (opts.x ?? MARGIN_L);
  if (idx < 0) {
    drawText(page, full, x, opts.baseline, o);
    return;
  }
  const before = full.slice(0, idx);
  const rest = full.slice(idx + accent.length);
  for (const [chunk, color] of [
    [before, o.color],
    [accent, accentColor],
    [rest, o.color],
  ] as [string, RGB][]) {
    if (!chunk) continue;
    drawText(page, chunk, x, opts.baseline, { ...o, color });
    x += widthOf(chunk, o);
  }
}

/** Greedy word wrap. Words longer than the column are hard-split. */
function wrap(text: string, maxWidth: number, o: TextOpts): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (widthOf(candidate, o) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (widthOf(word, o) <= maxWidth) {
        line = word;
      } else {
        let chunk = '';
        for (const ch of word) {
          if (widthOf(chunk + ch, o) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [''];
}

/**
 * Draws a line letter-spaced so it spans exactly `targetWidth`, centred on the
 * page. This is how the original renders its two header lines.
 */
function drawTracked(page: PDFPage, text: string, baseline: number, targetWidth: number, o: TextOpts) {
  const chars = [...text];
  const natural = widthOf(text, o);
  const gaps = Math.max(chars.length - 1, 1);
  const tracking = (targetWidth - natural) / gaps;
  let x = (W - targetWidth) / 2;
  for (const ch of chars) {
    if (ch !== ' ') drawText(page, ch, x, baseline, o);
    x += widthOf(ch, o) + tracking;
  }
}

/* ----------------------------------------------------------------- shapes */

function drawDashedRule(page: PDFPage, topY: number) {
  // 2.25pt dash / 0.75pt gap, matching the rule above the footer note.
  const y = at(topY);
  for (let x = 0; x < W; x += 3) {
    page.drawLine({
      start: { x, y },
      end: { x: Math.min(x + 2.25, W), y },
      thickness: 0.75,
      color: BLACK,
    });
  }
}

/** Green rounded square with a white tick, standing in for the ✅ emoji. */
function drawCheck(page: PDFPage, x: number, topY: number, size: number) {
  const s = size / 100;
  const y = at(topY);
  page.drawSvgPath(
    'M22,0 H78 A22,22 0 0 1 100,22 V78 A22,22 0 0 1 78,100 H22 A22,22 0 0 1 0,78 V22 A22,22 0 0 1 22,0 Z',
    { x, y, scale: s, color: GREEN },
  );
  page.drawSvgPath('M25,53 L43,71 L76,32', {
    x,
    y,
    scale: s,
    borderColor: WHITE,
    borderWidth: 13 * s,
    borderLineCap: 1, // round
  });
}

/* ------------------------------------------------------------ page header */

function drawHeader(page: PDFPage, fonts: Fonts, logo: { width: number; height: number }) {
  page.drawImage(logo as never, {
    x: LOGO.x,
    y: at(LOGO.top + LOGO.h),
    width: LOGO.w,
    height: LOGO.h,
  });
  const o: TextOpts = { size: SIZE.headerAddress, font: fonts.regular, color: GREY };
  drawTracked(page, COMPANY.addressLine, HEADER_LINES[0].baseline, HEADER_LINES[0].targetWidth, o);
  drawTracked(page, COMPANY.contactLine, HEADER_LINES[1].baseline, HEADER_LINES[1].targetWidth, o);
}

function drawFooterNote(page: PDFPage, fonts: Fonts, text: string, align: 'right' | 'center') {
  drawDashedRule(page, FOOTER_RULE_Y);
  const o: TextOpts = { size: SIZE.footer, font: fonts.semibold, color: RED };
  if (align === 'right') drawRight(page, text, W - MARGIN_R, FOOTER_BASELINE, o);
  else drawCentered(page, text, W / 2, FOOTER_BASELINE, o);
}

/* ------------------------------------------------------------------ page 1 */

/**
 * Keeps the invoice body flowing across pages. Long add-on lists push the
 * totals panel and the bank details down; rather than letting them run into the
 * footer, whatever no longer fits continues on a fresh, headed page.
 */
class Flow {
  page: PDFPage;
  /** True once the body has spilled past the first page. */
  broken = false;

  constructor(
    private doc: PDFDocument,
    private fonts: Fonts,
    private logo: never,
  ) {
    this.page = this.startPage();
  }

  private startPage(): PDFPage {
    const page = this.doc.addPage([W, H]);
    drawHeader(page, this.fonts, this.logo);
    drawFooterNote(page, this.fonts, PAGE1_FOOTER, 'right');
    return page;
  }

  /** Opens a continuation page and returns its first usable baseline. */
  break(): number {
    this.page = this.startPage();
    this.broken = true;
    return CONTINUATION_TOP;
  }

  fits(top: number, height: number) {
    return top + height <= CONTENT_LIMIT;
  }
}

function drawInvoicePage(doc: PDFDocument, fonts: Fonts, logo: never, input: InvoiceInput) {
  const flow = new Flow(doc, fonts, logo);
  let page = flow.page;

  /* --- headline ------------------------------------------------------- */
  drawAccented(
    page,
    HEADLINE,
    HEADLINE_ACCENT,
    { size: SIZE.headline, font: fonts.bold, color: INK },
    PURPLE,
    { x: MARGIN_L, baseline: 151 },
  );

  /* --- invoice to / meta block ---------------------------------------- */
  drawText(page, 'Invoice To', MARGIN_L, 190, {
    size: SIZE.invoiceToLabel,
    font: fonts.regular,
    color: INK,
  });
  drawFitted(
    page,
    input.customerName || '-',
    MARGIN_L,
    207,
    META_LABEL_X - MARGIN_L - 8,
    { size: SIZE.customerName, font: fonts.semibold, color: PURPLE },
  );

  const labelOpts: TextOpts = { size: SIZE.metaLabel, font: fonts.semibold, color: PURPLE };
  const valueOpts: TextOpts = { size: SIZE.metaValue, font: fonts.regular, color: INK };
  const metaValueMaxW = STATUS.x - META_VALUE_X - 10;
  // Service Type is chosen by hand only on a formation invoice. An ITIN names
  // its own service, and a renewal resolves to empty, which drops the row.
  const serviceLine = resolveServiceType(input);
  const meta: [string, string][] = [
    ['Invoice Date', formatInvoiceDate(input.invoiceDate)],
    ['Invoice No', input.invoiceNo],
    ...(serviceLine
      ? ([['Service Type', expand(serviceLine, input)]] as [string, string][])
      : []),
    ['Invoice By', input.invoiceBy],
  ];
  meta.forEach(([label, value], i) => {
    drawText(page, label, META_LABEL_X, META_ROWS[i], labelOpts);
    drawFitted(page, value, META_VALUE_X, META_ROWS[i], metaValueMaxW, valueOpts);
  });

  /* --- payment status box --------------------------------------------- */
  page.drawRectangle({
    x: STATUS.x,
    y: at(STATUS.topBoxTop + STATUS.topBoxH),
    width: STATUS.w,
    height: STATUS.topBoxH,
    color: PURPLE,
  });
  drawCentered(page, 'Payment  Status', STATUS.x + STATUS.w / 2, 204.5, {
    size: SIZE.statusTitle,
    font: fonts.bold,
    color: WHITE,
  });
  page.drawRectangle({
    x: STATUS.x,
    y: at(STATUS.bottomBoxTop + STATUS.bottomBoxH),
    width: STATUS.w,
    height: STATUS.bottomBoxH,
    color: WHITE,
    borderColor: GREY,
    borderWidth: 0.75,
  });
  drawCentered(page, findStatusLabel(input.paymentStatus), STATUS.x + STATUS.w / 2, 238.5, {
    size: SIZE.statusValue,
    font: fonts.bold,
    color: PURPLE,
  });

  /* --- line-item table ------------------------------------------------- */
  const headOpts: TextOpts = { size: SIZE.tableHead, font: fonts.bold, color: PURPLE };
  const drawTableHead = (target: PDFPage, baseline: number) => {
    drawText(target, 'DESCRIPTION', TABLE.descX, baseline, headOpts);
    drawCentered(target, 'QTY', TABLE.qtyCenter, baseline, headOpts);
    drawCentered(target, 'RATE', TABLE.rateCenter, baseline, headOpts);
    drawCentered(target, 'AMOUNT', TABLE.amountCenter, baseline, headOpts);
  };
  drawTableHead(page, TABLE.headBaseline);

  const rowOpts: TextOpts = { size: SIZE.tableRow, font: fonts.regular, color: BLACK };
  const items = buildLineItems(input);
  let baseline = TABLE.firstRowBaseline;
  // Baseline of the final printed line, so a wrapped description is not covered
  // by the totals panel that follows it.
  let lastLineBaseline = TABLE.firstRowBaseline - TABLE.rowHeight;
  for (const item of items) {
    const lines = wrap(item.description, TABLE.descMaxW, rowOpts);
    const height = TABLE.rowHeight + (lines.length - 1) * (SIZE.tableRow + 3);
    // Keep the row and the panel that follows it off the footer.
    if (!flow.fits(baseline, height)) {
      baseline = flow.break();
      page = flow.page;
      drawTableHead(page, baseline);
      baseline += TABLE.firstRowBaseline - TABLE.headBaseline;
    }
    lines.forEach((line, i) => {
      drawText(page, line, TABLE.descX, baseline + i * (SIZE.tableRow + 3), rowOpts);
    });
    drawCentered(page, String(item.qty), TABLE.qtyCenter, baseline, rowOpts);
    drawCentered(page, fmtShort(item.rate), TABLE.rateCenter, baseline, rowOpts);
    drawCentered(page, fmtShort(item.amount), TABLE.amountCenter, baseline, rowOpts);
    lastLineBaseline = baseline + (lines.length - 1) * (SIZE.tableRow + 3);
    baseline += height;
  }

  /* --- totals panel ---------------------------------------------------- */
  // The panel sits at a fixed height on page 1 to match the original design;
  // on a continuation page it simply follows the last row.
  let boxTop = Math.max(flow.broken ? 0 : TOTALS_BOX.minTop, lastLineBaseline + 8.67);
  if (!flow.fits(boxTop, TOTALS_BOX.h)) {
    boxTop = flow.break();
    page = flow.page;
  }
  page.drawRectangle({
    x: TOTALS_BOX.x,
    y: at(boxTop + TOTALS_BOX.h),
    width: TOTALS_BOX.w,
    height: TOTALS_BOX.h,
    color: PURPLE,
  });
  const totals = computeTotals(input);
  const totalsOpts: TextOpts = { size: SIZE.totals, font: fonts.regular, color: WHITE };
  const totalsRows: [string, string][] = [
    ['Sub Total', fmtLong(totals.subTotal)],
    ['Discount', fmtLong(totals.discount)],
    ['Payment', fmtLong(totals.payment)],
    ['Final Amount', fmtLong(totals.finalAmount)],
  ];
  totalsRows.forEach(([label, value], i) => {
    const y = boxTop + TOTALS_BOX.rowOffsets[i];
    drawText(page, label, TOTALS_BOX.labelX, y, totalsOpts);
    drawText(page, value, TOTALS_BOX.valueX, y, totalsOpts);
  });

  // Why the discount was given, printed in the panel's empty left half rather
  // than as a line item in the description table.
  const note = discountNote(input);
  if (note) {
    const noteOpts: TextOpts = { size: SIZE.body, font: fonts.regular, color: WHITE };
    const noteMaxW = TOTALS_BOX.labelX - TOTALS_BOX.x - 30;
    wrap(note, noteMaxW, noteOpts)
      .slice(0, 3)
      .forEach((line, i) => {
        drawText(page, line, TOTALS_BOX.x + 16, boxTop + TOTALS_BOX.rowOffsets[1] + i * 13, noteOpts);
      });
  }

  /* --- everything below the panel flows sequentially -------------------
     Gaps are collected first so that, if extra line items pushed the panel
     down, they can be squeezed evenly instead of overrunning the footer.  */
  const boxBottom = boxTop + TOTALS_BOX.h;
  const bodyOpts: TextOpts = { size: SIZE.body, font: fonts.regular, color: BLACK };
  const titleOpts: TextOpts = { size: SIZE.sectionTitle, font: fonts.semibold, color: PURPLE };

  type Block =
    | { kind: 'gap'; size: number }
    | { kind: 'line'; text: string; opts: TextOpts; advance: number; accent?: string; x?: number }
    | { kind: 'centered'; text: string; opts: TextOpts; advance: number; accent?: string };

  // One helper for both terms blocks: purple heading, then the wrapped body.
  const termsBlock = (title: string, body: string, leadGap: number): Block[] => {
    const lines = wrap(body, CONTENT_W, bodyOpts);
    return [
      { kind: 'gap', size: leadGap },
      { kind: 'line', text: title, opts: titleOpts, advance: 0 },
      { kind: 'gap', size: 21 },
      ...lines.map((text, i): Block => ({
        kind: 'line',
        text,
        opts: bodyOpts,
        advance: i < lines.length - 1 ? 16 : 0,
      })),
    ];
  };

  const blocks: Block[] = [
    { kind: 'gap', size: 34.93 },
    {
      kind: 'centered',
      text: THANK_YOU,
      opts: { size: SIZE.thankYou, font: fonts.bold, color: INK },
      advance: 0,
      accent: THANK_YOU_ACCENT,
    },
    // An ITIN order prints only the ITIN terms; anything else prints its own.
    ...(mainTermsApply(input) && input.paymentTermsTitle.trim()
      ? termsBlock(input.paymentTermsTitle, input.paymentTermsBody, 33)
      : []),
  ];

  // Second terms block, sitting just under the first — ITIN add-on only.
  if (itinTermsApply(input) && input.itinTermsTitle.trim()) {
    // Leads with the larger gap when it is the only terms block on the page.
    blocks.push(...termsBlock(input.itinTermsTitle, input.itinTermsBody, mainTermsApply(input) ? 26 : 33));
  }

  /* Bank details, side by side as in the current template: PKR on the left,
     USD on the right. Rendered as one column of rows so the shared vertical
     flow still governs spacing — each row carries the left block's line, and
     the right block's line is drawn at COLUMN_2_X on the same baseline.

     Falls back to stacking if there are ever more than two blocks. */
  const COLUMN_2_X = MARGIN_L + CONTENT_W / 2 + 12;

  if (BANK_BLOCKS.length === 2) {
    const [left, right] = BANK_BLOCKS;
    blocks.push({ kind: 'gap', size: 33 });

    // Titles share a baseline.
    blocks.push({ kind: 'line', text: left.title, opts: titleOpts, advance: 0 });
    blocks.push({ kind: 'line', text: right.title, opts: titleOpts, advance: 0, x: COLUMN_2_X });
    blocks.push({ kind: 'gap', size: 21 });

    const rows = Math.max(left.lines.length, right.lines.length);
    for (let i = 0; i < rows; i++) {
      const advance = i < rows - 1 ? 16 : 0;
      if (left.lines[i]) {
        blocks.push({ kind: 'line', text: left.lines[i], opts: bodyOpts, advance: right.lines[i] ? 0 : advance });
      }
      if (right.lines[i]) {
        blocks.push({ kind: 'line', text: right.lines[i], opts: bodyOpts, advance, x: COLUMN_2_X });
      }
      // A row where only the right column has content still needs to advance.
      if (!left.lines[i] && !right.lines[i]) blocks.push({ kind: 'gap', size: advance });
    }
  } else {
    for (const bank of BANK_BLOCKS) {
      blocks.push({ kind: 'gap', size: 33 });
      blocks.push({ kind: 'line', text: bank.title, opts: titleOpts, advance: 0 });
      blocks.push({ kind: 'gap', size: 21 });
      bank.lines.forEach((text, i) => {
        blocks.push({
          kind: 'line',
          text,
          opts: bodyOpts,
          advance: i < bank.lines.length - 1 ? 16 : 0,
        });
      });
    }
  }

  const fixed = blocks.reduce((sum, b) => sum + (b.kind === 'gap' ? 0 : b.advance), 0);
  const flexible = blocks.reduce((sum, b) => sum + (b.kind === 'gap' ? b.size : 0), 0);

  // Tighten the gaps a little to keep everything on this page; below 70% it
  // starts to look cramped, so move the whole block to a fresh page instead.
  let y = boxBottom;
  let squeeze = 1;
  const room = CONTENT_LIMIT - y - fixed;
  if (flexible > 0 && room < flexible) {
    const ratio = room / flexible;
    if (ratio >= 0.7) {
      squeeze = ratio;
    } else {
      const leadGap = blocks[0].kind === 'gap' ? blocks[0].size : 0;
      y = flow.break() - leadGap;
      page = flow.page;
    }
  }
  for (const block of blocks) {
    if (block.kind === 'gap') {
      y += block.size * squeeze;
      continue;
    }
    if (block.kind === 'centered') {
      drawAccented(page, block.text, block.accent ?? '', block.opts, PURPLE, {
        centerX: W / 2,
        baseline: y,
      });
    } else {
      // `x` places a line in the second column (the right-hand bank block);
      // everything else sits at the left margin.
      drawText(page, block.text, block.x ?? MARGIN_L, y, block.opts);
    }
    y += block.advance;
  }
}

/* ------------------------------------------------------------------ page 2 */

function drawCompliancePage(page: PDFPage, fonts: Fonts, logo: never, input: InvoiceInput) {
  drawHeader(page, fonts, logo);

  const title = expand(COMPLIANCE_TITLE, input);
  const accent = expand(COMPLIANCE_TITLE_ACCENT, input);
  drawAccented(
    page,
    title,
    accent,
    { size: SIZE.page2Title, font: fonts.bold, color: INK },
    PURPLE,
    { centerX: W / 2, baseline: 169 },
  );

  const body: TextOpts = { size: SIZE.page2Body, font: fonts.regular, color: BLACK };
  const heading: TextOpts = { size: SIZE.page2Body, font: fonts.semibold, color: PURPLE };
  const LEADING = 16.5;
  const CHECK_INDENT = 18;

  let y = 226;
  for (const block of COMPLIANCE_BLOCKS) {
    if (block.kind === 'gap') {
      y += block.size;
      continue;
    }
    const text = expand(block.text, input);
    if (block.kind === 'heading') {
      drawText(page, text, MARGIN_L, y, heading);
      y += LEADING;
      continue;
    }
    if (block.kind === 'check') {
      drawCheck(page, MARGIN_L, y - 10.5, 11.5);
      for (const line of wrap(text, CONTENT_W - CHECK_INDENT, body)) {
        drawText(page, line, MARGIN_L + CHECK_INDENT, y, body);
        y += LEADING;
      }
      continue;
    }
    const prefix = block.kind === 'bullet' ? '• ' : '';
    for (const line of wrap(prefix + text, CONTENT_W, body)) {
      drawText(page, line, MARGIN_L, y, body);
      y += LEADING;
    }
  }

  drawFooterNote(page, fonts, PAGE2_FOOTER, 'center');
}

/* ------------------------------------------------------------------ entry */

export async function renderInvoicePdf(input: InvoiceInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const { fonts, logo } = await loadAssets(doc);

  const state = findState(input.stateCode);
  doc.setTitle(`Invoice ${input.invoiceNo} - ${input.customerName}`);
  doc.setSubject(`${state.stateName} - ${expand(input.serviceType, input)}`);
  doc.setProducer('ForeMint Invoice');
  doc.setCreator('ForeMint Invoice');

  drawInvoicePage(doc, fonts, logo as never, input);
  if (input.includeCompliancePage) {
    drawCompliancePage(doc.addPage([W, H]), fonts, logo as never, input);
  }
  return doc.save();
}
