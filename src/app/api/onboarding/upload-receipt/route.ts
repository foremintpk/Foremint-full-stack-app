import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: 'foremint/payment-receipts', resource_type: 'auto' },
            (err, res) => {
              if (err || !res) reject(err)
              else resolve({ secure_url: res.secure_url, public_id: res.public_id })
            }
          )
          .end(buffer)
      }
    )

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id })
  } catch (error) {
    console.error('Receipt upload error:', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
