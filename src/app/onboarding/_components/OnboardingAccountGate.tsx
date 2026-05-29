"use client"

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { useOnboardingAccount } from '@/context/onboarding-context'
import { AccountCreationPopup } from './account/AccountCreationPopup'

export function OnboardingAccountGate() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const {
    showAccountPopup,
    tempSessionKey,
    closeAccountPopup,
    completeAccountAndAdvance,
  } = useOnboardingAccount()

  const advanceRef = useRef(completeAccountAndAdvance)
  advanceRef.current = completeAccountAndAdvance

  const oauthReturnHandled = useRef(false)
  const successHandled = useRef(false)

  // Google OAuth return — run once, do not depend on completeAccountAndAdvance identity
  useEffect(() => {
    if (searchParams.get('auth_complete') !== 'true') return
    if (oauthReturnHandled.current) return
    oauthReturnHandled.current = true

    const storedKey = sessionStorage.getItem('fm_onboarding_session_key')
    if (storedKey) {
      sessionStorage.removeItem('fm_onboarding_session_key')
    }

    const cleanPath = pathname ?? '/onboarding/step/6'
    router.replace(cleanPath as Parameters<typeof router.replace>[0])

    void (async () => {
      if (tempSessionKey) {
        try {
          await fetch('/api/onboarding/draft/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ temp_session_key: tempSessionKey }),
          })
        } catch (err) {
          console.error('Failed to link draft after OAuth:', err)
        }
      }
      advanceRef.current()
    })()
  }, [searchParams, pathname, router, tempSessionKey])

  const handleSuccess = useCallback(
    async (user: User) => {
      if (!tempSessionKey || successHandled.current) return
      successHandled.current = true

      try {
        await fetch('/api/onboarding/draft/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ temp_session_key: tempSessionKey }),
        })
      } catch (err) {
        console.error('Failed to link draft:', err)
      }

      closeAccountPopup()
      advanceRef.current()
    },
    [tempSessionKey, closeAccountPopup]
  )

  if (!showAccountPopup || !tempSessionKey) return null

  return (
    <AccountCreationPopup
      tempSessionKey={tempSessionKey}
      onSuccess={handleSuccess}
      onClose={closeAccountPopup}
    />
  )
}
