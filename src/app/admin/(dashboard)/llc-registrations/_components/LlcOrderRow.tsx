'use client';

import React, { useTransition, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MoreVertical, Eye, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import type { LlcOrderRow as LlcOrderRowType } from '@/types/admin';
import LlcStatusBadge from './LlcStatusBadge';
import LlcNewBadge from './LlcNewBadge';
import { formatPKR, formatDate, timeAgo } from '@/lib/admin/formatters';
import { deleteLlcOrder } from '@/lib/admin/actions/deleteLlcOrder';

interface LlcOrderRowProps {
  order: LlcOrderRowType;
}

export default function LlcOrderRow({ order }: LlcOrderRowProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const href = `/admin/llc-registrations/${order.id}`;

  // Three-dot menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Close menu on outside click
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

  const handleRowClick = () => {
    if (isPending || menuOpen) return;
    startTransition(() => { router.push(href as any); });
  };

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setShowDeleteModal(false);
  };

  return (
    <>
      <div
        role="row"
        tabIndex={isPending ? -1 : 0}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        aria-label={`View order ${order.orderNumber} — ${order.llcName}`}
        className={`grid grid-cols-[1fr_1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_auto] gap-0 px-6 py-3.5 bg-white border rounded-2xl group transition-all duration-150 items-center ${isPending
          ? 'border-[#c4b5fd] bg-[#fdfcff] opacity-70 cursor-wait shadow-sm'
          : 'border-[#e0d9f7] shadow-[0_1px_4px_rgba(52,8,143,0.06)] cursor-pointer hover:border-[#c4b5fd] hover:shadow-[0_2px_12px_rgba(52,8,143,0.07)] hover:bg-[#fdfcff] focus:outline-none focus:border-[#34088f] focus:shadow-[0_0_0_3px_rgba(52,8,143,0.1)]'
          }`}
      >
        {/* Column 1 — Order Number */}
        <div role="cell" className="text-sm font-semibold text-[#111111] group-hover:text-[#34088f] transition-colors">
          <div className="flex items-center gap-1.5">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin text-[#34088f]" /> : null}
            {order.orderNumber}
            {order.isNew && <LlcNewBadge />}
          </div>
        </div>

        {/* Column 2 — Client */}
        <div role="cell" className="text-sm text-[#111111]">
          <p className="font-medium truncate">{order.clientName ?? '—'}</p>
          <p className="text-xs text-[#6b7280] truncate">{order.clientEmail}</p>
        </div>

        {/* Column 3 — LLC Name */}
        <div role="cell" className="text-sm text-[#111111]">
          <p className="font-semibold group-hover:text-[#34088f] transition-colors truncate">{order.llcName}</p>
          <p className="text-xs text-[#6b7280]">{order.formationState ?? '—'}</p>
        </div>

        {/* Column 4 — Status */}
        <div role="cell" className="text-sm">
          <LlcStatusBadge status={order.status} />
        </div>

        {/* Column 5 — Date */}
        <div role="cell" className="text-sm text-[#111111]">
          <p>{formatDate(order.submittedAt ?? order.createdAt)}</p>
          <p className="text-xs text-[#6b7280]">{timeAgo(order.createdAt)}</p>
        </div>

        {/* Column 6 — Pending Amount */}
        <div role="cell" className="text-right text-sm">
          {order.paymentStatus !== 'paid' && order.pendingAmount > 0 ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
              {`$ ${order.pendingAmount}`}
            </span>
          ) : (
            <span className="text-[#d1d5db] text-xs">—</span>
          )}
        </div>

        {/* Column 7 — Action Menu */}
        <div role="cell" className="flex items-center justify-end pl-3" ref={menuRef}>
          <div className="relative">
            <button
              onClick={handleMenuClick}
              aria-label="Order actions"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#9ca3af] hover:text-[#34088f] hover:bg-[#f4f0fe] transition-all focus:outline-none focus:ring-2 focus:ring-[#34088f]/20"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-9 z-50 w-44 bg-white border border-[#e5e7eb] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] py-1.5 animate-fade-in"
              >
                <button
                  role="menuitem"
                  onClick={handleView}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f4f0fe] hover:text-[#34088f] transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> View Order
                </button>
                <button
                  role="menuitem"
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f4f0fe] hover:text-[#34088f] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Order
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  role="menuitem"
                  onClick={handleDeleteClick}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onKeyDown={handleModalKeyDown}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => !isDeleting && setShowDeleteModal(false)}
              disabled={isDeleting}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            {/* Title */}
            <h2 id="delete-modal-title" className="text-base font-black text-gray-900 font-manrope mb-2">
              Delete LLC Order
            </h2>

            {/* Message */}
            <p className="text-sm text-gray-600 font-inter mb-1">
              Are you sure you want to permanently delete this LLC order?
            </p>
            <p className="text-xs text-gray-500 font-inter mb-5">
              Order <span className="font-bold text-gray-800">{order.orderNumber}</span> — {order.llcName}
            </p>
            <p className="text-xs font-semibold text-red-600 font-inter mb-6">
              This action cannot be undone. All linked files, documents, and history will be permanently removed.
            </p>

            {/* Error */}
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold font-inter">
                {deleteError}
              </div>
            )}

            {/* Actions */}
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
                  <>
                    <Trash2 className="w-4 h-4" /> Delete Order
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
