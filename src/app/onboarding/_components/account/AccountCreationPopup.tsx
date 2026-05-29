"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

const supabase = createClient()
import { GoogleSignUpButton } from './GoogleSignUpButton'
import { EmailSignUpForm } from './EmailSignUpForm'
import { EmailVerificationPrompt } from './EmailVerificationPrompt'
import type { User } from '@supabase/supabase-js'

type PopupStage = 'auth-choice' | 'email-form' | 'verify-email'

interface AccountCreationPopupProps {
  tempSessionKey: string
  onSuccess: (user: User) => void
  onClose?: () => void
}

export function AccountCreationPopup({
  tempSessionKey,
  onSuccess,
  onClose,
}: AccountCreationPopupProps) {
  const [stage, setStage] = useState<PopupStage>('auth-choice')
  const [pendingEmail, setPendingEmail] = useState('')
  const successCalled = useRef(false)

  const handleSuccess = useCallback(
    (user: User) => {
      if (successCalled.current) return
      successCalled.current = true
      onSuccess(user)
    },
    [onSuccess]
  )

  // Email OTP verification only — OAuth redirects away from this popup
  useEffect(() => {
    if (stage !== 'verify-email') return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'USER_UPDATED') &&
        session?.user
      ) {
        handleSuccess(session.user)
      }
    })
    return () => subscription.unsubscribe()
  }, [stage, handleSuccess])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close account popup"
        className="absolute inset-0 bg-gray-950/45 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-[0_20px_60px_rgba(52,8,143,0.18)] overflow-hidden">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-md p-1.5 text-white/75 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
        <div className="bg-[#34088f] px-6 py-5">
          <h2 className="text-lg font-bold text-white font-[Manrope]">
            Create Your Account
          </h2>
          <p className="text-white/70 text-sm mt-0.5">
            Save your progress and manage your LLC order.
          </p>
        </div>

        <div className="px-6 py-6">
          {stage === 'auth-choice' && (
            <div className="flex flex-col gap-4">
              <GoogleSignUpButton
                tempSessionKey={tempSessionKey}
                onSuccess={handleSuccess}
              />

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or continue with email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={() => setStage('email-form')}
                className="w-full border border-gray-200 rounded-lg py-3 text-sm font-semibold text-gray-700 hover:border-[#34088f]/40 hover:text-[#34088f] transition-colors"
              >
                Sign up with Email
              </button>

              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setStage('email-form')}
                  className="text-[#34088f] font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {stage === 'email-form' && (
            <EmailSignUpForm
              tempSessionKey={tempSessionKey}
              onVerificationSent={email => {
                setPendingEmail(email)
                setStage('verify-email')
              }}
              onSignInSuccess={handleSuccess}
              onBack={() => setStage('auth-choice')}
            />
          )}

          {stage === 'verify-email' && (
            <EmailVerificationPrompt
              email={pendingEmail}
              onVerified={handleSuccess}
              onBack={() => setStage('email-form')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
