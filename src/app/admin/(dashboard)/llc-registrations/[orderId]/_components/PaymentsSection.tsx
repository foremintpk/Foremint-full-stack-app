/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/PaymentsSection.tsx
 * @description Operational payments overview and bank transfer manual receipt verification section.
 */

'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Trash2,
  Loader2,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  X,
  Upload,
} from 'lucide-react';
import { deleteDocument } from '@/lib/admin/actions/deleteDocument';
import { ResubmissionButton } from './ResubmissionButton';
import { ReadOnlyField } from './ReadOnlyField';
import { DocumentActionButtons } from './DocumentActionButtons';
import { safeFormatUSD } from '@/lib/pricing';
import { isImageUrl } from '@/lib/download-file';
import { PAYMENT_RECEIPT_SLOT_KEY } from '@/lib/onboarding/syncMemberDocuments';
import type { OrderDetail } from '@/types/admin';

interface PaymentsSectionProps {
  order: OrderDetail;
  adminId: string;
}

function receiptFileNameFromSnapshot(formSnapshot: Record<string, unknown>): string {
  const step7 = formSnapshot[7] as Record<string, unknown> | undefined;
  return (
    (step7?.receiptFileName as string) ??
    (formSnapshot.receiptFileName as string) ??
    'payment-receipt'
  );
}

export function PaymentsSection({
  order,
  adminId,
}: PaymentsSectionProps): React.JSX.Element {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  const matchingDoc =
    order.documents.find(
      doc => doc.slotKey === PAYMENT_RECEIPT_SLOT_KEY && doc.isActive !== false
    ) ??
    (order.paymentReceiptUrl
      ? order.documents.find(
          doc => doc.url === order.paymentReceiptUrl && doc.isActive !== false
        )
      : undefined);

  const previewUrl = matchingDoc?.url ?? order.paymentReceiptUrl ?? null;
  const displayFileName =
    matchingDoc?.fileName ?? receiptFileNameFromSnapshot(order.formSnapshot);
  const documentId = matchingDoc?.id ?? null;

  const hasReceipt = !!previewUrl;
  const isDeleted =
    !previewUrl &&
    order.documents.some(
      d => d.slotKey === PAYMENT_RECEIPT_SLOT_KEY && d.isActive === false
    );

  const hasResubmitRequest = order.resubmissionRequests.some(
    r => r.memberIndex === null && r.fieldName === 'payment_receipt'
  );

  const handleReplaceUpload = async (file: File) => {
    setIsReplacing(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('slotKey', PAYMENT_RECEIPT_SLOT_KEY);
      body.append('adminId', adminId);

      const res = await fetch(`/api/admin/orders/${order.id}/documents`, {
        method: 'POST',
        body,
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(data.error || 'Failed to upload payment receipt');
        return;
      }

      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsReplacing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!documentId) return;
    if (
      !confirm(
        'Are you sure you want to delete this payment receipt? This action is permanent (soft-deleted in audit logs).'
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteDocument(documentId, order.id, adminId);
      if (!res.success) {
        alert(res.error || 'Failed to delete receipt');
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred during deletion');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border border-[#e0d9f7] rounded-xl overflow-hidden bg-white shadow-sm p-5 space-y-6">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <CreditCard className="w-4 h-4 text-[#34088f]" />
        <h4 className="text-xs md:text-sm font-bold font-manrope text-gray-900 uppercase tracking-wide">
          Financials & Payments
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/20 p-4 border border-[#ebebeb] rounded-[0.125rem]">
        <ReadOnlyField label="State Filing Fee" value={safeFormatUSD(order.stateFee)} />
        <ReadOnlyField label="Package Price" value={safeFormatUSD(order.packagePrice)} />
        <ReadOnlyField label="Addon Services Total" value={safeFormatUSD(order.addonsTotal)} />
        <div className="border-b border-[#f3f4f6] md:border-b-0 py-2.5">
          <div className="text-[11px] font-bold font-inter uppercase tracking-wider text-[#34088f] mb-0.5">
            Grand Total Billed
          </div>
          <div className="text-lg font-bold font-inter text-[#34088f] leading-none">
            {safeFormatUSD(order.grandTotal)}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 font-inter">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          Manual Payment Receipt
        </span>

        {isDeleted ? (
          <div className="p-3 bg-red-50/50 border border-red-200 text-xs font-semibold text-red-700 rounded-[0.125rem]">
            No payment receipt uploaded (previously deleted).
          </div>
        ) : !hasReceipt ? (
          <div className="p-3 bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-400 rounded-[0.125rem]">
            No manual payment receipt uploaded.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-[#ebebeb] rounded-[0.125rem] bg-gray-50/25 text-black">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[0.125rem] bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                {isImageUrl(previewUrl, matchingDoc?.mimeType) ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
                  {displayFileName}
                </p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase flex items-center gap-1">
                  <span>{matchingDoc?.mimeType || 'UPLOAD'}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-emerald-700 flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" />
                    Uploaded
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleReplaceUpload(file);
                }}
              />

              <DocumentActionButtons
                url={previewUrl}
                fileName={displayFileName}
                onPreview={() => setShowPreviewModal(true)}
                previewLabel="Preview Receipt"
                downloadLabel="Download"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReplacing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#34088f] bg-white border border-[#34088f]/30 hover:bg-[#f4f0fe] active:scale-95 transition-all rounded-[0.125rem] disabled:opacity-50"
              >
                {isReplacing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Replace
              </button>

              <ResubmissionButton
                orderId={order.id}
                memberIndex={null}
                fieldName="payment_receipt"
                adminId={adminId}
                hasRequest={hasResubmitRequest}
              />

              {documentId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 active:scale-95 transition-all rounded-[0.125rem] disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Delete Receipt
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showPreviewModal && previewUrl && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-[3px] flex items-center justify-center z-50 animate-fade-in font-inter p-4">
          <div className="bg-white border border-[#ebebeb] p-6 rounded-sm shadow-xl max-w-3xl w-full flex flex-col gap-4 animate-scale-up text-black">
            <div className="flex items-center justify-between border-b border-gray-150 pb-2">
              <h4 className="text-sm font-bold font-manrope text-gray-900 truncate">
                Preview Receipt: {displayFileName}
              </h4>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="w-full h-[50vh] flex items-center justify-center bg-gray-50 border border-[#ebebeb] overflow-hidden relative">
              {isImageUrl(previewUrl, matchingDoc?.mimeType) ? (
                <img
                  src={previewUrl}
                  alt="Payment receipt preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
                  <FileText className="w-12 h-12 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-600">
                    Interactive preview is only available for images.
                  </p>
                  <DocumentActionButtons
                    url={previewUrl}
                    fileName={displayFileName}
                    downloadLabel="Download Receipt"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <DocumentActionButtons
                url={previewUrl}
                fileName={displayFileName}
                downloadLabel="Download"
              />
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 rounded-[0.125rem] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
