/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/ResubmissionButton.tsx
 * @description Beautiful, self-contained Resubmission Button control with note dialog popups.
 */

'use client';

import React, { useState } from 'react';
import { MailQuestion, Loader2, Check, AlertTriangle, X } from 'lucide-react';
import { requestDocumentResubmission } from '@/lib/admin/actions/requestDocumentResubmission';

interface ResubmissionButtonProps {
 orderId: string;
 memberIndex: number | null;
 fieldName: string;
 adminId: string;
 hasRequest: boolean;
}

export function ResubmissionButton({
 orderId,
 memberIndex,
 fieldName,
 adminId,
 hasRequest,
}: ResubmissionButtonProps): React.JSX.Element {
 const [showNoteDialog, setShowNoteDialog] = useState(false);
 const [note, setNote] = useState('The document submitted is blurry. Please submit a clearer image of your ID.');
 const [loading, setLoading] = useState(false);
 const [success, setSuccess] = useState(false);

 const handleCreate = async () => {
 setLoading(true);
 try {
 const res = await requestDocumentResubmission(
 orderId,
 memberIndex,
 fieldName,
 adminId,
 false,
 note
 );
 if (res.success) {
 setSuccess(true);
 setTimeout(() => {
 setSuccess(false);
 setShowNoteDialog(false);
 }, 1500);
 } else {
 alert(res.error || 'Failed to submit request');
 }
 } catch (err: any) {
 alert(err?.message || 'An error occurred');
 } finally {
 setLoading(false);
 }
 };

 const handleCancel = async () => {
 if (!confirm('Are you sure you want to cancel this pending resubmission request?')) {
 return;
 }
 setLoading(true);
 try {
 const res = await requestDocumentResubmission(
 orderId,
 memberIndex,
 fieldName,
 adminId,
 true
 );
 if (!res.success) {
 alert(res.error || 'Failed to cancel request');
 }
 } catch (err: any) {
 alert(err?.message || 'An error occurred');
 } finally {
 setLoading(false);
 }
 };

 if (hasRequest) {
 return (
 <button
 onClick={handleCancel}
 disabled={loading}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100/70 active:scale-95 transition-all rounded-[0.125rem] disabled:opacity-50"
 >
 {loading ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 ) : (
 <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
 )}
 Resubmission Pending (Click to Cancel)
 </button>
 );
 }

 return (
 <>
 <button
 onClick={() => setShowNoteDialog(true)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#34088f] hover:bg-[#34088f]/5 border border-[#34088f]/20 hover:border-[#34088f]/40 active:scale-95 transition-all rounded-[0.125rem]"
 >
 <MailQuestion className="w-3.5 h-3.5" />
 Request Resubmission
 </button>

 {/* Modal Dialog for custom resubmission instructions */}
 {showNoteDialog && (
 <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px] flex items-center justify-center z-50 animate-fade-in font-inter p-4">
 <div className="bg-white border border-[#ebebeb] p-6 rounded-sm shadow-xl max-w-md w-full space-y-4 animate-scale-up text-black">
 <div className="flex items-center justify-between border-b border-gray-100 pb-2">
 <h4 className="text-sm font-bold font-manrope text-gray-900">
 Request Document Resubmission
 </h4>
 <button
 onClick={() => setShowNoteDialog(false)}
 className="text-gray-400 hover:text-black transition-colors"
 >
 <X className="w-4.5 h-4.5" />
 </button>
 </div>

 <div className="space-y-1">
 <label htmlFor="resubmit-note" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Reason / Instructions for Customer
 </label>
 <textarea
 id="resubmit-note"
 rows={4}
 value={note}
 onChange={(e) => setNote(e.target.value)}
 className="w-full border border-[#ebebeb] px-3 py-2 text-xs font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <button
 onClick={() => setShowNoteDialog(false)}
 disabled={loading}
 className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-[0.125rem] transition-all disabled:opacity-50"
 >
 Cancel
 </button>
 
 <button
 onClick={handleCreate}
 disabled={loading}
 className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-[#34088f] hover:opacity-90 rounded-[0.125rem] transition-all disabled:opacity-70"
 >
 {loading ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 ) : success ? (
 <Check className="w-3.5 h-3.5" />
 ) : null}
 {loading ? 'Submitting' : success ? 'Sent ✓' : 'Send Request'}
 </button>
 </div>
 </div>
 </div>
 )}
 </>
 );
}
