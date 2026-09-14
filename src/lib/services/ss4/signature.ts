import 'server-only';
import { promises as fs } from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb } from "pdf-lib";
import * as mupdf from "mupdf";

/**
 * Server-side signature generation.
 *
 * lib/ss4/signature.ts renders the name on a browser canvas, which API routes
 * cannot do. This draws the same name into a throwaway PDF with the same
 * Caveat font, size, padding, baseline tilt and seeded jitter, then rasterizes
 * it to a transparent PNG. A given name always signs identically.
 */
const FONT_SIZE = 150;
const PADDING = 18;
/** Whole-signature upward tilt in degrees (PDF y-axis points up). */
const BASELINE_TILT = 3;
const RASTER_SCALE = 2;

let fontBytes: Uint8Array | null = null;

async function loadFont(): Promise<Uint8Array> {
  if (!fontBytes) {
    const file = path.join(process.cwd(), "public", "fonts", "Caveat.ttf");
    fontBytes = new Uint8Array(await fs.readFile(file));
  }
  return fontBytes;
}

/** Deterministic pseudo-random in [-1, 1] from a seed, so a name always signs the same. */
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Renders a name as a transparent handwritten-signature PNG data URL. */
export async function generateSignaturePng(name: string): Promise<string> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await loadFont(), { subset: false });

  const chars = [...name];
  const advances = chars.map((c) => font.widthOfTextAtSize(c, FONT_SIZE));
  const textWidth = advances.reduce((sum, w) => sum + w, 0);

  const ascent = font.heightAtSize(FONT_SIZE, { descender: false });
  const descent = Math.max(font.heightAtSize(FONT_SIZE) - ascent, FONT_SIZE * 0.2);

  const theta = (BASELINE_TILT * Math.PI) / 180;
  const tiltRise = Math.tan(theta) * textWidth;

  const page = doc.addPage([
    Math.ceil(textWidth + PADDING * 2),
    Math.ceil(ascent + descent + tiltRise + PADDING * 2),
  ]);
  const baseY = PADDING + descent;

  let x = 0;
  chars.forEach((char, i) => {
    const jitterY = seededNoise(i + 1) * FONT_SIZE * 0.035;
    const jitterRot = (seededNoise(i * 7 + 3) * 0.03 * 180) / Math.PI;
    const jitterScale = 1 + seededNoise(i * 3 + 5) * 0.04;

    if (char.trim()) {
      page.drawText(char, {
        x: PADDING + x * Math.cos(theta) - jitterY * Math.sin(theta),
        y: baseY + x * Math.sin(theta) + jitterY * Math.cos(theta),
        size: FONT_SIZE * jitterScale,
        font,
        color: rgb(0.067, 0.067, 0.067),
        rotate: degrees(BASELINE_TILT + jitterRot),
      });
    }
    x += advances[i];
  });

  const rendered = mupdf.Document.openDocument(await doc.save(), "application/pdf");
  const pixmap = rendered
    .loadPage(0)
    .toPixmap(mupdf.Matrix.scale(RASTER_SCALE, RASTER_SCALE), mupdf.ColorSpace.DeviceRGB, true, true);

  return `data:image/png;base64,${Buffer.from(pixmap.asPNG()).toString("base64")}`;
}
