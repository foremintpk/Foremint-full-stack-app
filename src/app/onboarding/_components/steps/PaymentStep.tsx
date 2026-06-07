"use client"

import { useState } from 'react'
import { CreditCard, Building2, Check, TicketPercent, X, Loader2 } from 'lucide-react'
import { BankTransferDetails } from '../payment/BankTransferDetails'
import { PaymentReceiptUpload } from '../payment/PaymentReceiptUpload'
import { OrderSummaryBar } from '../ui/OrderSummaryBar'
import { useOnboarding } from '@/context/onboarding-context'
import type { OnboardingFormData } from '@/types/onboarding'

interface PaymentStepProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
}

export function PaymentStep({ formData, onChange }: PaymentStepProps) {
  const { setShowAccountPopup } = useOnboarding()
  const addonTotal = formData.addonTotal ?? 0
  const subtotal = formData.stateFee + formData.packagePrice + addonTotal
  const couponDiscount = Math.max(0, formData.couponDiscountAmount ?? 0)
  const grandTotal = Math.max(0, subtotal - couponDiscount)
  const [couponCode, setCouponCode] = useState(formData.couponCode ?? '')
  const [showCouponField, setShowCouponField] = useState(Boolean(formData.couponCode))
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponMessage, setCouponMessage] = useState<string | null>(formData.couponCode ? 'Coupon applied.' : null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)

  const hasCoupon = Boolean(formData.couponCode && couponDiscount > 0)

  const clearCoupon = () => {
    setCouponCode('')
    setCouponError(null)
    setCouponMessage(null)
    onChange({
      couponCode: null,
      couponId: null,
      couponName: null,
      couponDiscountType: null,
      couponDiscountValue: null,
      couponDiscountAmount: null,
    })
  }

  const applyCoupon = async () => {
    const code = couponCode.trim()
    if (!code) {
      setCouponError('Enter a coupon code.')
      return
    }

    setIsValidatingCoupon(true)
    setCouponError(null)
    setCouponMessage(null)

    try {
      const res = await fetch('/api/onboarding/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal,
        }),
      })

      const data = await res.json() as {
        success?: boolean
        error?: string
        coupon?: {
          id: string
          name: string
          code: string
          discountType: 'percentage' | 'amount'
          discountValue: number
          discountAmount: number
        }
      }

      if (!res.ok || !data.success || !data.coupon) {
        if (res.status === 401) {
          setCouponError('Please create an account or sign in to apply a coupon.')
          setShowAccountPopup(true)
        } else {
          setCouponError(data.error || 'Invalid coupon code.')
        }
        onChange({
          couponCode: null,
          couponId: null,
          couponName: null,
          couponDiscountType: null,
          couponDiscountValue: null,
          couponDiscountAmount: null,
        })
        return
      }

      setCouponCode(data.coupon.code)
      setCouponMessage(`Coupon "${data.coupon.code}" applied.`)
      onChange({
        couponCode: data.coupon.code,
        couponId: data.coupon.id,
        couponName: data.coupon.name,
        couponDiscountType: data.coupon.discountType,
        couponDiscountValue: data.coupon.discountValue,
        couponDiscountAmount: data.coupon.discountAmount,
      })
    } catch {
      setCouponError('Unable to validate the coupon right now.')
    } finally {
      setIsValidatingCoupon(false)
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 font-[Manrope]">
          Payment
        </h1>
        <p className="mt-2 text-sm sm:text-[15px] font-medium text-gray-500 leading-relaxed max-w-2xl">
          Select your preferred payment method to complete your LLC order.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className="space-y-6">
          <div className="rounded-lg border border-[#e0d9f7] bg-[#34088f] px-5 py-4 flex items-center justify-between">
            <span className="text-white/80 text-sm font-semibold">Amount Due</span>
            <span className="text-white text-2xl font-extrabold font-[Manrope]">
              ${grandTotal.toLocaleString()}
            </span>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
            <button
              type="button"
              onClick={() => setShowCouponField((current) => !current)}
              className="flex items-center gap-2 text-sm font-semibold text-[#34088f]"
            >
              <TicketPercent size={16} />
              Have a coupon?
            </button>

            {showCouponField && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-gray-900 placeholder:text-gray-400 focus:border-[#34088f] focus:outline-none focus:ring-2 focus:ring-[#34088f]/10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCoupon ? (
                      <button
                        type="button"
                        onClick={clearCoupon}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:border-red-200 hover:text-red-600"
                      >
                        <X size={16} />
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={isValidatingCoupon}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#34088f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2a0673] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isValidatingCoupon ? <Loader2 size={16} className="animate-spin" /> : null}
                        Apply
                      </button>
                    )}
                  </div>
                </div>

                {couponError && (
                  <p className="text-xs font-semibold text-red-600">{couponError}</p>
                )}
                {couponMessage && !couponError && (
                  <p className="text-xs font-semibold text-emerald-600">{couponMessage}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onChange({ paymentMethod: 'bank-transfer' })}
              className={paymentCardClass(formData.paymentMethod === 'bank-transfer')}
            >
              <div className="flex items-start justify-between gap-4">
                <Building2 size={22} className={formData.paymentMethod === 'bank-transfer' ? 'text-[#34088f]' : 'text-gray-400'} />
                <Radio selected={formData.paymentMethod === 'bank-transfer'} />
              </div>
              <span className="mt-4 text-base font-bold text-gray-950">Bank Transfer</span>
              <span className="mt-1 text-sm text-gray-500">Wire or ACH transfer</span>
            </button>

            <div className="relative flex min-h-[140px] flex-col items-start rounded-lg border border-gray-200 bg-gray-50 p-5 opacity-70">
              <span className="absolute right-4 top-4 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-500">
                Coming Soon
              </span>
              <CreditCard size={22} className="text-gray-400" />
              <span className="mt-4 text-base font-bold text-gray-500">Card Payment</span>
              <span className="mt-1 text-sm text-gray-400">Visa, Mastercard, Amex</span>
            </div>
          </div>

          {formData.paymentMethod === 'bank-transfer' && (
            <div className="animate-[fadeIn_0.18s_ease-out] space-y-5">
              <BankTransferDetails amount={grandTotal} businessName={formData.businessName} />
              <PaymentReceiptUpload
                existingUrl={formData.receiptUrl ?? null}
                existingFileName={formData.receiptFileName ?? null}
                onUploaded={(url, publicId, fileName) =>
                  onChange({
                    receiptUrl: url || null,
                    receiptPublicId: publicId || null,
                    receiptFileName: fileName || null,
                  })
                }
              />
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-6">
          <OrderSummaryBar
            stateName={formData.formationStateName}
            stateFee={formData.stateFee}
            packageName={formData.selectedPackageName}
            packagePrice={formData.packagePrice}
            addonTotal={addonTotal}
            addons={formData.selectedAddons ?? []}
            couponCode={formData.couponCode}
            couponName={formData.couponName}
            couponDiscountAmount={formData.couponDiscountAmount}
          />
        </div>
      </div>
    </div>
  )
}

function paymentCardClass(selected: boolean) {
  return [
    'flex min-h-[140px] flex-col items-start rounded-lg border p-5 text-left transition-all',
    selected
      ? 'border-[#34088f] bg-[#f8f5ff] shadow-[0_0_0_1px_#34088f]'
      : 'border-gray-200 bg-white hover:border-[#34088f]/40 hover:shadow-[0_8px_24px_rgba(52,8,143,0.06)]',
  ].join(' ')
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span
      className={[
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
        selected ? 'border-[#34088f] bg-[#34088f]' : 'border-gray-300 bg-white',
      ].join(' ')}
    >
      {selected && <Check size={12} className="text-white stroke-[3]" />}
    </span>
  )
}
