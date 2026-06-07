/**
 * @file B2BCustomersClient.tsx
 * @description Client shell for the B2B Customers page: list, create, edit, delete.
 */

'use client';

import React, { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, Loader2, Briefcase, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AssignableOrder, B2BCustomer } from '@/types/admin';
import { deleteB2BCustomer } from '@/lib/admin/actions/b2bCustomerActions';
import { B2BCustomerModal } from './B2BCustomerModal';

interface B2BCustomersClientProps {
  customers: B2BCustomer[];
  orders: AssignableOrder[];
  canManage: boolean;
}

export function B2BCustomersClient({ customers, orders, canManage }: B2BCustomersClientProps) {
  const router = useRouter();
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; customer?: B2BCustomer } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<B2BCustomer | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleClose = () => {
    setModal(null);
    router.refresh();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    startDelete(async () => {
      const res = await deleteB2BCustomer(deleteTarget.id);
      if (res.error) {
        setDeleteError(res.error);
      } else {
        setDeleteTarget(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setModal({ mode: 'create' })}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-[#34088f] hover:bg-[#34088f]/90 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" /> Create B2B Customer
          </button>
        </div>
      )}

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-[#e0d9f7]">
          <div className="w-12 h-12 rounded-xl bg-[#f4f0fe] flex items-center justify-center mb-3">
            <Briefcase className="w-6 h-6 text-[#34088f]" />
          </div>
          <p className="text-sm font-bold text-gray-900">No B2B customers yet</p>
          <p className="text-xs text-gray-500 mt-1">Create a B2B customer and assign LLC orders for them to view.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-[#e0d9f7]">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-[#faf8ff]">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assigned LLCs</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                {canManage && <th className="px-5 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-sm font-bold text-gray-900">{c.fullName || 'Unnamed'}</div>
                    <div className="text-xs text-gray-500 select-text">{c.email}</div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-600 select-text">{c.phone || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 bg-[#f4f0fe] text-[#34088f] border border-[#e0d9f7] rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                      <Building2 className="w-3 h-3" /> {c.assignedOrderCount}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                      c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal({ mode: 'edit', customer: c })}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#34088f] hover:bg-[#f4f0fe] transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeleteError(null); setDeleteTarget(c); }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <B2BCustomerModal
          mode={modal.mode}
          customer={modal.customer}
          orders={orders}
          onClose={handleClose}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-[#e0d9f7] shadow-xl p-6 font-inter animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-gray-900 font-manrope">Delete B2B Customer</h3>
            <p className="text-xs text-gray-500 mt-2">
              This permanently deletes <span className="font-bold text-gray-700">{deleteTarget.fullName || deleteTarget.email}</span> and
              removes their LLC assignments. The LLC orders themselves are not affected. This cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-3 p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">{deleteError}</div>
            )}
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-[#e0d9f7] rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
