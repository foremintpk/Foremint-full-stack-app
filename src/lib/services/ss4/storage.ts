/**
 * @file src/lib/services/ss4/storage.ts
 * @description Uploads generated SS-4 packets to Cloudinary.
 *
 * Mirrors the conventions already used by the order-documents route: PDFs go up
 * as resource_type 'raw' with the extension kept in the public_id, so Cloudinary
 * serves real PDF bytes with Content-Type: application/pdf rather than trying to
 * treat the file as an image.
 */

import 'server-only';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadedPacket {
  url: string;
  publicId: string;
  bytes: number;
}

/** Strips characters Cloudinary or a filesystem would choke on. */
function sanitize(name: string): string {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 120);
}

/**
 * Stores one generated packet.
 *
 * Foldered per order so a client's documents stay together, and stamped with
 * the attempt and a timestamp so a regeneration never overwrites the packet
 * that was actually filed — the earlier attempt has to remain retrievable.
 */
export async function uploadSs4Packet(
  bytes: Uint8Array,
  options: { orderId: string; orderNumber: string; companyName: string; attempt: number }
): Promise<UploadedPacket> {
  const base = sanitize(
    `${options.orderNumber}-${options.companyName}-SS4-attempt${options.attempt}`
  );
  const publicId = `${Date.now()}-${base}.pdf`;

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    bytes: number;
  }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `foremint/ss4/${options.orderId}`,
          public_id: publicId,
          resource_type: 'raw',
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error('Cloudinary returned no result for the SS-4 upload.'));
            return;
          }
          resolve(uploaded as { secure_url: string; public_id: string; bytes: number });
        }
      )
      .end(Buffer.from(bytes));
  });

  return { url: result.secure_url, publicId: result.public_id, bytes: result.bytes };
}

/** Stores an administrator-uploaded SS-4 base template. */
export async function uploadSs4Template(
  bytes: Uint8Array,
  fileName: string
): Promise<UploadedPacket> {
  const publicId = `${Date.now()}-${sanitize(fileName)}.pdf`;

  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    bytes: number;
  }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'foremint/ss4/templates', public_id: publicId, resource_type: 'raw' },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error('Cloudinary returned no result for the template upload.'));
            return;
          }
          resolve(uploaded as { secure_url: string; public_id: string; bytes: number });
        }
      )
      .end(Buffer.from(bytes));
  });

  return { url: result.secure_url, publicId: result.public_id, bytes: result.bytes };
}

/** Removes a stored file. Used when an administrator deletes a template. */
export async function deleteSs4Asset(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}
