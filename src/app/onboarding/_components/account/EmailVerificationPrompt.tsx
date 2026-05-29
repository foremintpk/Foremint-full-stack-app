"use client"

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, ChevronLeft, Loader2 } from 'lucide-react'
import { OtpInput } from '@/components/onboarding/ui/otp-input'
import type { User } from '@supabase/supabase-js'

interface EmailVerificationPromptProps {
  email: string
  onVerified: (user: User) => void
  onBack: () => void
}

const RESEND_COOLDOWN_SEC = 60

export function EmailVerificationPrompt({
  email,
  onVerified,
  onBack,
}: EmailVerificationPromptProps) {
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SEC)
  const [otpKey, setOtpKey] = useState(0)

  const supabase = createClient()

  const startResendCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN_SEC)
  }, [])

  useEffect(() => {
    startResendCooldown()
  }, [startResendCooldown])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleVerifyOtp = async (otp: string) => {
    setError(null)
    setIsVerifying(true)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      })

      if (verifyError) {
        setError(verifyError.message)
        setOtpKey(k => k + 1)
        return
      }

      if (data.user) {
        onVerified(data.user)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        onVerified(user)
        return
      }

      setError('Verification failed. Please try again.')
      setOtpKey(k => k + 1)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return

    setError(null)
    setIsResending(true)

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (resendError) {
        setError(resendError.message)
        return
      }

      setOtpKey(k => k + 1)
      startResendCooldown()
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="w-14 h-14 rounded-full bg-[#f4f0fe] flex items-center justify-center">
        <Mail size={24} className="text-[#34088f]" />
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 font-[Manrope] mb-1">
          Verify your email
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          Enter the 6-digit code we sent to{' '}
          <span className="font-semibold text-gray-800">{email}</span>
        </p>
      </div>

      <div className="w-full">
        <OtpInput
          key={otpKey}
          length={6}
          onComplete={handleVerifyOtp}
          error={error ?? undefined}
          disabled={isVerifying}
        />
      </div>

      {isVerifying && (
        <div className="flex items-center gap-2 text-xs text-[#34088f]">
          <Loader2 size={14} className="animate-spin" />
          Verifying…
        </div>
      )}

      <div className="bg-[#f4f0fe] rounded-2xl px-4 py-3 w-full text-left">
        <p className="text-xs text-[#34088f] leading-relaxed">
          Check your spam folder if you don&apos;t see the email within a minute.
          The code expires after a short time.
        </p>
      </div>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendCooldown > 0 || isResending}
        className="text-sm text-[#34088f] font-medium hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
      >
        {isResending
          ? 'Sending…'
          : resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : 'Resend code'}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft size={14} />
        Use a different email
      </button>
    </div>
  )
}
