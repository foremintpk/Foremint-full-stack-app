// Uses signed upload via server-side Cloudinary SDK
// Never expose CLOUDINARY_API_SECRET to the client

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

interface CloudinaryUploadOptions {
  folder: string;
  public_id: string;
}

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.public_id,
        resource_type: 'auto',
        // Restrict transformations for security
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
        // Tag for easy management
        tags: ['onboarding'],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
}
