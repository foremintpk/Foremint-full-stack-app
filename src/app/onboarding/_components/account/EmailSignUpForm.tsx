"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { GoogleSignUpButton } from './GoogleSignUpButton'

interface EmailSignUpFormProps {
  tempSessionKey: string
  onVerificationSent: (email: string) => void
  onSignInSuccess: (user: User) => void
  onBack: () => void
}

type FormMode = 'signup' | 'signin'

const inputClass = `
  w-full bg-gray-50 border border-gray-200 rounded-lg
  px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
  focus:outline-none focus:ring-2 focus:ring-[#34088f]/25 focus:border-[#34088f]
  transition-colors duration-150
`

export function EmailSignUpForm({
  tempSessionKey,
  onVerificationSent,
  onSignInSuccess,
  onBack,
}: EmailSignUpFormProps) {
  const [mode, setMode] = useState<FormMode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSubmit = async () => {
    setError(null)

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Full name is required.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)

    try {
      if (mode === 'signup') {
        const existsRes = await fetch(`/api/onboarding/auth/email-exists?email=${encodeURIComponent(email)}`)
        const existsJson = (await existsRes.json()) as { exists?: boolean; error?: string }
        if (!existsRes.ok || existsJson.error) {
          setError(existsJson.error ?? 'Unable to check this email. Please try again.')
          return
        }
        if (existsJson.exists) {
          const message = 'User already exists. Please login instead.'
          setError(message)
          toast.error(message)
          setMode('signin')
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
          },
        })
        if (signUpError) {
          setError(signUpError.message)
          return
        }

        // Email confirmation disabled in Supabase — session returned immediately
        if (data.session?.user) {
          onSignInSuccess(data.session.user)
          return
        }

        // Supabase sends the signup confirmation OTP when "Confirm email" is enabled
        onVerificationSent(email)
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          setError(signInError.message)
          return
        }
        if (data.user) onSignInSuccess(data.user)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors w-fit"
      >
        <ChevronLeft size={14} />
        Back
      </button>

      <div className="flex bg-gray-100 rounded-full p-1">
        {(['signup', 'signin'] as FormMode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={[
              'flex-1 py-1.5 rounded-full text-sm font-semibold transition-colors duration-150',
              mode === m ? 'bg-white text-[#34088f] shadow-sm' : 'text-gray-500',
            ].join(' ')}
          >
            {m === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        ))}
      </div>

      <GoogleSignUpButton
        tempSessionKey={tempSessionKey}
        onSuccess={onSignInSuccess}
        label={mode === 'signup' ? 'Continue with Google' : 'Login with Google'}
      />

      {mode === 'signup' && (
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Full Name"
          className={inputClass}
        />
      )}

      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email Address"
        className={inputClass}
      />

      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password (min 8 characters)"
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-[#34088f] hover:bg-[#2a0778] disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 size={15} className="animate-spin" />}
        {mode === 'signup' ? 'Create Account' : 'Sign In'}
      </button>
    </div>
  )
}
