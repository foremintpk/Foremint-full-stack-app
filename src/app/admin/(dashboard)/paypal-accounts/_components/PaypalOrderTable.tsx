import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { PaypalOrder, UserRole } from '@/types/admin';
import { PaypalOrderRow } from './PaypalOrderRow';
import { PaypalOrderStatusBadge } from './PaypalOrderStatusBadge';
import { PaypalOrderTypeBadge } from './PaypalOrderTypeBadge';
import { PaypalOrderActionMenu } from './PaypalOrderActionMenu';
import { formatDate } from '@/lib/admin/formatters';

interface PaypalOrderTableProps {
  orders: PaypalOrder[];
}

export async function PaypalOrderTable({ orders }: PaypalOrderTableProps) {
  // Fetch current admin information on the server
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const sessionUser = claimsData?.claims;

  if (!sessionUser) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', sessionUser.sub)
    .single();

  const currentAdminRole = (profile?.role || 'customer') as UserRole;

  return (
    <div className="w-full">
      {/* Mobile Stack View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {orders.map((order) => {
          const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(order.dealAmount);

          return (
            <div
              key={order.id}
              className="p-5 bg-white border border-[#e0d9f7] rounded-2xl transition-all duration-150 select-text flex flex-col gap-4 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_6px_20px_rgba(52,8,143,0.1)]"
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-gray-900 truncate font-manrope text-base">
                    {order.customerName}
                  </h4>
                  <p className="text-xs text-gray-500 truncate select-all font-inter">{order.email}</p>
                </div>
                <div className="flex-shrink-0">
                  <PaypalOrderActionMenu
                    order={order}
                    currentAdminRole={currentAdminRole}
                  />
                </div>
              </div>

              {/* Notes (Optional) */}
              {order.notes && (
                <div className="bg-[#f4f0fe] rounded-xl p-3 text-xs text-gray-600 font-inter border border-[#e0d9f7]/40">
                  <span className="block font-semibold text-[#34088f] mb-0.5">Notes:</span>
                  {order.notes}
                </div>
              )}

              {/* Details List */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#e0d9f7] text-xs font-inter">
                <div>
                  <span className="block text-gray-400 font-semibold mb-0.5">Date</span>
                  <span className="text-gray-900 font-medium font-manrope">
                    {formatDate(order.date)}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-400 font-semibold mb-0.5">Deal Amount</span>
                  <span className="text-gray-900 font-bold font-manrope text-sm">
                    {formattedAmount}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-400 font-semibold mb-0.5">Type</span>
                  <PaypalOrderTypeBadge type={order.type} />
                </div>
                <div>
                  <span className="block text-gray-400 font-semibold mb-0.5">Status</span>
                  <PaypalOrderStatusBadge status={order.status} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Grid Table View */}
      <div className="hidden md:block w-full border border-[#e0d9f7] rounded-2xl bg-white shadow-[0_1px_4px_rgba(52,8,143,0.06)] font-inter">
        {/* Table Header */}
        <div className="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr_0.8fr_0.6fr] gap-4 px-6 py-3.5 bg-[#f4f0fe] border-b border-[#e0d9f7] rounded-t-2xl text-xs font-semibold text-[#34088f] uppercase tracking-wider select-none font-manrope">
          <div>Customer</div>
          <div>Email</div>
          <div>Date</div>
          <div>Deal Amount</div>
          <div>Type</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#e0d9f7] [&>*:last-child]:rounded-b-2xl">
          {orders.map((order) => (
            <PaypalOrderRow
              key={order.id}
              order={order}
              currentAdminRole={currentAdminRole}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
