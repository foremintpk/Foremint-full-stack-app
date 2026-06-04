'use client';

import React, { useTransition, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MoreVertical, Eye, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { LlcOrderRow } from '@/types/admin';
import LlcStatusBadge from './LlcStatusBadge';
import LlcNewBadge from './LlcNewBadge';
import { formatPKR, formatDate } from '@/lib/admin/formatters';
import { deleteLlcOrder } from '@/lib/admin/actions/deleteLlcOrder';

interface LlcOrderCardProps {
  order: LlcOrderRow;
}

export default function LlcOrderCard({ order }: LlcOrderCardProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const href = `/admin/llc-registrations/${order.id}`;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const handleCardClick = () => {
    if (isPending || menuOpen) return;
    startTransition(() => { router.push(href as any); });
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isPending || menuOpen) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startTransition(() => { router.push(href as any); });
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    startTransition(() => { router.push(href as any); });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    startTransition(() => { router.push(href as any); });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteLlcOrder(order.id);
      if (result.success) {
        setShowDeleteModal(false);
        router.refresh();
      } else {
        setDeleteError(result.error || 'Failed to delete order.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  }, [order.id, router]);

  return (
    <>
      <div
        role="button"
        tabIndex={isPending ? -1 : 0}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        aria-label={`View order ${order.orderNumber} — ${order.llcName}`}
        className={`block bg-white border rounded-2xl p-4 transition-all duration-150 ${isPending
            ? 'border-[#c4b5fd] shadow-sm opacity-70 cursor-wait'
            : 'border-[#e0d9f7] shadow-[0_1px_4px_rgba(52,8,143,0.04)] hover:border-[#c4b5fd] hover:shadow-[0_4px_16px_rgba(52,8,143,0.08)] cursor-pointer focus:outline-none focus:border-[#34088f] focus:shadow-[0_0_0_3px_rgba(52,8,143,0.1)]'
          }`}
      >
        {/* Row 1: Order Number + NEW + Status + Menu */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm font-bold text-[#111111] gap-1.5">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin text-[#34088f]" /> : null}
            {order.orderNumber}
            {order.isNew && <LlcNewBadge />}
          </div>
          <div className="flex items-center gap-2">
            <LlcStatusBadge status={order.status} />
            {/* Three-dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={handleMenuClick}
                aria-label="Order actions"
                className="w-7 h-7 flex items-center justify-center rounded-full text-[#9ca3af] hover:text-[#34088f] hover:bg-[#f4f0fe] transition-all"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-50 w-40 bg-white border border-[#e5e7eb] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] py-1.5 animate-fade-in">
                  <button
                    onClick={handleView}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f4f0fe] hover:text-[#34088f] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Order
                  </button>
                  <button
                    onClick={handleEdit}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f4f0fe] hover:text-[#34088f] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Order
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleDeleteClick}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Client Info */}
        <div className="text-xs text-[#111111] mb-3 font-inter">
          <p className="font-semibold text-sm">{order.clientName ?? '—'}</p>
          <p className="text-[#6b7280]">{order.clientEmail}</p>
        </div>

        <hr className="border-t border-[#f3f4f6] my-2" />

        {/* Row 3: LLC Name & formation info */}
        <div className="text-xs text-[#111111] my-3">
          <p className="font-bold text-sm text-[#34088f]">{order.llcName}</p>
          <p className="text-[#6b7280] mt-0.5">
            {order.formationState ?? '—'} &middot; {formatDate(order.submittedAt ?? order.createdAt)}
          </p>
        </div>

        {/* Pending amount */}
        {order.paymentStatus !== 'paid' && order.pendingAmount > 0 && (
          <>
            <hr className="border-t border-[#f3f4f6] my-2" />
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-[#6b7280] font-medium">Payment Due:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
                {formatPKR(order.pendingAmount)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-card-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !isDeleting && setShowDeleteModal(false)}
              disabled={isDeleting}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            <h2 id="delete-card-modal-title" className="text-base font-black text-gray-900 font-manrope mb-2">
              Delete LLC Order
            </h2>
            <p className="text-sm text-gray-600 font-inter mb-1">
              Are you sure you want to permanently delete this LLC order?
            </p>
            <p className="text-xs text-gray-500 font-inter mb-5">
              Order <span className="font-bold text-gray-800">{order.orderNumber}</span> — {order.llcName}
            </p>
            <p className="text-xs font-semibold text-red-600 font-inter mb-6">
              This action cannot be undone. All linked files, documents, and history will be permanently removed.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold font-inter">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 border border-[#e5e7eb] rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all font-manrope"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-full text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-manrope flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete Order</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
