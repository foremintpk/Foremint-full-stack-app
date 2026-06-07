/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/MemberCard.tsx
 * @description Operational card displaying member credentials and managing ID document reviews.
 */

'use client';

import React, { useState, useRef } from 'react';
import { Shield, Trash2, Loader2, FileText, Image as ImageIcon, X, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteDocument } from '@/lib/admin/actions/deleteDocument';
import { ResubmissionButton } from './ResubmissionButton';
import { ReadOnlyField } from './ReadOnlyField';
import { DocumentActionButtons } from './DocumentActionButtons';
import { isImageUrl } from '@/lib/download-file';
import type { OrderMember, OrderDocument } from '@/types/admin';

interface MemberCardProps {
 orderId: string;
 member: OrderMember;
 documents: OrderDocument[];
 adminId: string;
}

export function MemberCard({
 orderId,
 member,
 documents,
 adminId,
}: MemberCardProps): React.JSX.Element {
 const router = useRouter();
 const fileInputRef = useRef<HTMLInputElement>(null);
 const [showPreviewModal, setShowPreviewModal] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [isReplacing, setIsReplacing] = useState(false);

 const memberSlotKey = `member_${member.index}_passport`;

 const matchingDoc =
   documents.find(
     doc => doc.slotKey === memberSlotKey && doc.isActive !== false
   ) ?? (member.idDocUrl
     ? documents.find(doc => doc.url === member.idDocUrl && doc.isActive !== false)
     : undefined);

 const documentId = matchingDoc?.id || null;
 const previewUrl = matchingDoc?.url ?? member.idDocUrl ?? null;
 const displayFileName = matchingDoc?.fileName || 'ID Document';

 const hasUploadedDoc = !!previewUrl;
 const isDeleted =
   !previewUrl &&
   documents.some(
     d => d.slotKey === memberSlotKey && d.isActive === false
   );

 const handleReplaceUpload = async (file: File) => {
 setIsReplacing(true);
 try {
 const body = new FormData();
 body.append('file', file);
 body.append('slotKey', memberSlotKey);
 body.append('adminId', adminId);

 const res = await fetch(`/api/admin/orders/${orderId}/documents`, {
 method: 'POST',
 body,
 });

 const data = (await res.json()) as { error?: string };
 if (!res.ok) {
 alert(data.error || 'Failed to upload replacement document');
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
 if (!confirm('Are you sure you want to delete this ID document? This action is permanent (soft-deleted in audit logs).')) {
 return;
 }
 
 setIsDeleting(true);
 try {
 const res = await deleteDocument(documentId, orderId, adminId);
 if (!res.success) {
 alert(res.error || 'Failed to delete document');
 }
 } catch (err: any) {
 alert(err?.message || 'An error occurred during deletion');
 } finally {
 setIsDeleting(false);
 }
 };

 return (
 <div className="border border-gray-150 rounded-[0.125rem] bg-gray-50/15 overflow-hidden shadow-sm hover:border-[#34088f]/20 transition-all font-inter">
 {/* Card Header */}
 <div className="bg-gray-50/60 px-5 py-3 border-b border-gray-150 flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <Shield className="w-4 h-4 text-[#34088f]" />
 <span className="text-xs md:text-sm font-bold text-gray-900 font-manrope">
 Member #{member.index + 1} — {member.position}
 </span>
 </div>
 </div>

 {/* Member Details */}
 <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2.5">
 <ReadOnlyField label="Full Name" value={member.name} />
 <ReadOnlyField label="Country" value={member.country} />
 </div>
 <div className="space-y-2.5">
 <ReadOnlyField
 label="Residential Address"
 value={
 [member.address, member.city, member.state]
 .filter(Boolean)
 .join(', ') || '—'
 }
 />
 </div>
 </div>

 {/* Document Review Section */}
 <div className="border-t border-gray-150 px-5 py-4 bg-white flex flex-col gap-3">
 <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Identity Verification Document
 </span>

 {isDeleted ? (
 /* Document was previously deleted */
 <div className="p-3 bg-red-50/50 border border-red-200 text-xs font-semibold text-red-700 rounded-[0.125rem]">
 No ID document uploaded (previously deleted).
 </div>
 ) : !hasUploadedDoc ? (
 /* No document uploaded initially */
 <div className="p-3 bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-400 rounded-[0.125rem]">
 No ID document uploaded.
 </div>
 ) : (
 /* Document exists and is active */
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-[#ebebeb] rounded-[0.125rem] bg-gray-50/20 text-black">
 {/* Document details */}
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-[0.125rem] bg-[#34088f]/5 flex items-center justify-center text-[#34088f] border border-[#34088f]/10">
 {matchingDoc?.mimeType?.startsWith('image/') ? (
 <ImageIcon className="w-5 h-5" />
 ) : (
 <FileText className="w-5 h-5" />
 )}
 </div>
 <div className="space-y-0.5 min-w-0">
 <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
 {displayFileName}
 </p>
 <p className="text-[10px] text-gray-500 font-semibold uppercase">
 {matchingDoc?.mimeType || 'IMAGE'}
 </p>
 </div>
 </div>

 {/* Verification & Action buttons */}
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

 {documentId && (
 <DocumentActionButtons
 docId={documentId}
 onPreview={() => setShowPreviewModal(true)}
 />
 )}

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
 {hasUploadedDoc ? 'Replace' : 'Upload'}
 </button>

 {/* Resubmission Trigger Button */}
 <ResubmissionButton
 orderId={orderId}
 memberIndex={member.index}
 fieldName="id_document"
 adminId={adminId}
 hasRequest={member.hasResubmitRequest}
 />

 {/* Delete soft button */}
 {documentId && (
 <button
 onClick={handleDelete}
 disabled={isDeleting}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 active:scale-95 transition-all rounded-[0.125rem] disabled:opacity-50"
 >
 {isDeleting ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 ) : (
 <Trash2 className="w-3.5 h-3.5" />
 )}
 Delete
 </button>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Full-screen Overlay Interactive Image Modal */}
 {showPreviewModal && previewUrl && (
 <div className="fixed inset-0 bg-black/65 backdrop-blur-[3px] flex items-center justify-center z-50 animate-fade-in font-inter p-4">
 <div className="bg-white border border-[#ebebeb] p-6 rounded-sm shadow-xl max-w-3xl w-full flex flex-col gap-4 animate-scale-up text-black">
 <div className="flex items-center justify-between border-b border-gray-150 pb-2">
 <h4 className="text-sm font-bold font-manrope text-gray-900 truncate">
 Preview: {displayFileName}
 </h4>
 <button
 onClick={() => setShowPreviewModal(false)}
 className="text-gray-400 hover:text-black transition-colors"
 >
 <X className="w-4.5 h-4.5" />
 </button>
 </div>

 {/* Content box */}
 <div className="w-full h-[50vh] flex items-center justify-center bg-gray-50 border border-[#ebebeb] overflow-hidden relative">
 {isImageUrl(previewUrl, matchingDoc?.mimeType) ? (
 <img
 src={previewUrl}
 alt="Identity document preview"
 className="max-w-full max-h-full object-contain"
 />
 ) : (
 <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
 <FileText className="w-12 h-12 text-gray-400" />
 <p className="text-sm font-semibold text-gray-600">
 Interactive preview is only available for images.
 </p>
 <DocumentActionButtons
 docId={documentId}
 downloadLabel="Download Document"
 />
 </div>
 )}
 </div>

 <div className="flex items-center justify-end gap-2">
 {documentId && (
 <DocumentActionButtons
 docId={documentId}
 downloadLabel="Download"
 />
 )}
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
