"use client"

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

function ThankYouContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('orderNumber') ?? ''
  const businessName = searchParams.get('businessName') ?? 'your business'

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 4000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_40px_rgba(52,8,143,0.10)] overflow-hidden text-center">
        <div className="bg-[#34088f] px-6 py-8">
          <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white font-[Manrope]">
            Order Submitted!
          </h1>
          <p className="text-white/70 text-sm mt-1">
            {orderNumber && `Order ${orderNumber}`}
          </p>
        </div>

        <div className="px-6 py-8 flex flex-col gap-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Your LLC formation order for{' '}
            <span className="font-semibold text-gray-900">{businessName}</span>{' '}
            has been submitted successfully. We&apos;ll be in touch within 1–2
            business days.
          </p>

          <div className="bg-[#f4f0fe] rounded-2xl px-4 py-3">
            <p className="text-xs text-[#34088f] leading-relaxed">
              A confirmation email has been sent to your inbox. You&apos;re being
              redirected to your dashboard…
            </p>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-[#34088f] rounded-full"
              style={{ animation: 'progressBar 4s linear forwards' }}
            />
          </div>

          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#34088f] text-white font-semibold py-2.5 rounded-full text-sm hover:bg-[#2a0778] transition-colors"
          >
            Go to Dashboard Now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes progressBar {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  )
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  )
}
