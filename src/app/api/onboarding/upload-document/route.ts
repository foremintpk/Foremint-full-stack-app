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
    const tempSessionKey = formData.get('tempSessionKey') as string | null
    const slotKey = formData.get('slotKey') as string | null

    if (!file || !tempSessionKey || !slotKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // File size guard — documents should be under 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 413 })
    }

    // Allowed MIME types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPG, PNG, WEBP, PDF.' },
        { status: 415 }
      )
    }

    // Convert to buffer for Cloudinary upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Cloudinary
    const uploadResult = await new Promise<{
      secure_url: string; public_id: string
    }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `foremint/onboarding/${tempSessionKey}`,
          resource_type: 'auto',
          public_id: `${slotKey}_${Date.now()}`,
        },
        (error, result) => {
          if (error || !result) reject(error)
          else resolve({ secure_url: result.secure_url, public_id: result.public_id })
        }
      ).end(buffer)
    })

    // Store reference in onboarding_drafts.form_data directly instead of documents table
    // since documents table requires NOT NULL profile_id. 
    // Profile ID is not known yet (created in Chunk 4), so we will insert the document
    // record after the user account is created.
    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileName: file.name,
    })
  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
