// src/app/api/onboarding/save-step/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json() as {
      tempSessionKey: string
      stepIndex: number
      formData: Record<string, unknown>
      completedSteps: number[]
    }

    const { tempSessionKey, stepIndex, formData, completedSteps } = body

    if (!tempSessionKey || typeof stepIndex !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { error } = await supabase
      .from('onboarding_drafts')
      .update({
        current_step: stepIndex,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form_data: formData as any,
        completed_steps: completedSteps,
        updated_at: new Date().toISOString(),
      })
      .eq('temp_session_key', tempSessionKey)

    if (error) {
      return NextResponse.json({ error: 'Failed to save draft: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
