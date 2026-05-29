import type React from 'react'
import type { CouponUsage } from '@/types/admin'

export function CouponUsageTable({ usages }: { usages: CouponUsage[] }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 font-manrope">Coupon Usage History</h2>
        <p className="mt-1 text-xs font-semibold text-gray-500">
          Recent coupon redemptions grouped by user and order.
        </p>
      </div>

      {usages.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <Th>Coupon</Th>
                <Th>User</Th>
                <Th>Order</Th>
                <Th>Discount</Th>
                <Th>Used At</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usages.map((usage) => (
                <tr key={usage.id} className="hover:bg-gray-50/70">
                  <Td>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-gray-900">{usage.couponName}</p>
                      <p className="text-[11px] uppercase tracking-wider text-gray-400">{usage.couponCode}</p>
                    </div>
                  </Td>
                  <Td>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-gray-900">{usage.userName || 'Unknown user'}</p>
                      <p className="text-[11px] text-gray-500">{usage.userEmail || 'No email'}</p>
                    </div>
                  </Td>
                  <Td>
                    <p className="font-semibold text-gray-900">{usage.orderNumber || 'Pending order'}</p>
                  </Td>
                  <Td>
                    <span className="font-semibold text-emerald-600">-${usage.discountAmount.toLocaleString()}</span>
                  </Td>
                  <Td>
                    <span className="text-sm text-gray-600">{new Date(usage.usedAt).toLocaleString()}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-10 text-center text-sm text-gray-500">
          No coupon redemptions yet.
        </div>
      )}
    </section>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-4 align-top">{children}</td>
}
