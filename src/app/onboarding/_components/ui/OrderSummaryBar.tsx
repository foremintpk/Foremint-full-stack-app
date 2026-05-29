// src/app/onboarding/_components/ui/OrderSummaryBar.tsx
// Used in Formation, Add-ons, Payment, and Review steps

interface OrderSummaryBarProps {
  stateName: string | null
  stateFee: number
  packageName: string | null
  packagePrice: number
  addonTotal: number
  addons?: Array<{ name: string; price: number }>
  couponCode?: string | null
  couponName?: string | null
  couponDiscountAmount?: number | null
}

export function OrderSummaryBar({
  stateName, stateFee, packageName,
  packagePrice, addonTotal, addons = [],
  couponCode = null, couponName = null, couponDiscountAmount = null,
}: OrderSummaryBarProps) {
  const subtotal = stateFee + packagePrice + addonTotal
  const discount = Math.max(0, couponDiscountAmount ?? 0)
  const grandTotal = Math.max(0, subtotal - discount)

  return (
    <aside className="rounded-lg border border-[#e0d9f7] bg-white p-5 w-full shadow-[0_10px_30px_rgba(52,8,143,0.06)]">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
        Order Summary
      </p>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <span className="text-sm text-gray-600 font-inter leading-snug">
            State Fee {stateName ? `(${stateName})` : ''}
          </span>
          <span className="text-sm font-semibold text-gray-900 font-inter tabular-nums">
            {stateFee > 0 ? `$${stateFee.toLocaleString()}` : '-'}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <span className="text-sm text-gray-600 font-inter leading-snug">
            {packageName ?? 'Selected package'}
          </span>
          <span className="text-sm font-semibold text-gray-900 font-inter tabular-nums">
            {packagePrice > 0 ? `$${packagePrice.toLocaleString()}` : '-'}
          </span>
        </div>

        {addons.map((addon, i) => (
          <div key={`${addon.name}-${i}`} className="flex items-start justify-between gap-4">
            <span className="text-sm text-gray-600 font-inter leading-snug">{addon.name}</span>
            <span className="text-sm font-semibold text-gray-900 font-inter tabular-nums">
              ${addon.price.toLocaleString()}
            </span>
          </div>
        ))}

        {addonTotal > 0 && addons.length === 0 && (
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-gray-600 font-inter leading-snug">Add-ons</span>
            <span className="text-sm font-semibold text-gray-900 font-inter tabular-nums">
              ${addonTotal.toLocaleString()}
            </span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-emerald-700 font-inter leading-snug">
              Coupon {couponCode ? `(${couponCode})` : ''}{couponName ? ` - ${couponName}` : ''}
            </span>
            <span className="text-sm font-semibold text-emerald-700 font-inter tabular-nums">
              -${discount.toLocaleString()}
            </span>
          </div>
        )}

        <div className="border-t border-[#e0d9f7] pt-4 mt-2 flex items-end justify-between">
          <span className="text-sm font-bold text-gray-900 font-inter">Total</span>
          <span className="text-2xl font-extrabold text-[#34088f] font-[Manrope] tabular-nums">
            {grandTotal > 0 ? `$${grandTotal.toLocaleString()}` : '-'}
          </span>
        </div>
      </div>
    </aside>
  )
}
