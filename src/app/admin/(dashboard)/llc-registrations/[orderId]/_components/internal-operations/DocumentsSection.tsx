/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/internal-operations/DocumentsSection.tsx
 * @description Coordinate sub-section for uploading operational documents, managing slots, and version history.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Files, Loader2, UploadCloud, Eye, Trash2, Calendar, FileText, CheckCircle2, Download } from 'lucide-react';
import { triggerDocumentDownload } from '@/lib/download-file';
import { deleteDocument } from '@/lib/admin/actions/deleteDocument';
import type { OrderDocument } from '@/types/admin';

interface DocumentsSectionProps {
 orderId: string;
 adminId: string;
 initialDocuments: OrderDocument[];
}

export function DocumentsSection({
 orderId,
 adminId,
 initialDocuments,
}: DocumentsSectionProps): React.JSX.Element {
 const [documents, setDocuments] = useState<OrderDocument[]>(initialDocuments);
 const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
 const [uploadError, setUploadError] = useState<string | null>(null);
 const [deletingId, setDeletingId] = useState<string | null>(null);

 // Form state for additional document
 const [additionalTitle, setAdditionalTitle] = useState('');
 const [additionalFile, setAdditionalFile] = useState<File | null>(null);

 // Filter documents
 const getLatestForSlot = useCallback((slotKey: string) => {
 return documents.find((doc) => doc.slotKey === slotKey && doc.isActive);
 }, [documents]);

 const getSupersededForSlot = useCallback((slotKey: string) => {
 return documents.filter((doc) => doc.slotKey === slotKey && !doc.isActive);
 }, [documents]);

 const getAdditionalDocs = useCallback(() => {
 return documents.filter((doc) => doc.slotKey === 'additional');
 }, [documents]);

 const handleUpload = async (slotKey: string, file: File, customTitle?: string) => {
 setUploadingSlot(slotKey);
 setUploadError(null);

 const formData = new FormData();
 formData.append('file', file);
 formData.append('slotKey', slotKey);
 formData.append('adminId', adminId);
 if (customTitle) {
 formData.append('title', customTitle);
 }

 try {
 const res = await fetch(`/api/admin/orders/${orderId}/documents`, {
 method: 'POST',
 body: formData,
 });

 const data = await res.json();
 if (!res.ok || data.error) {
 setUploadError(data.error || 'Failed to upload document.');
 return;
 }

 // If it was a fixed slot, mark previous docs of the same slot as superseded in local state
 let updatedDocs = [...documents];
 if (slotKey !== 'additional') {
 updatedDocs = updatedDocs.map((doc) => {
 if (doc.slotKey === slotKey && doc.isActive) {
 return { ...doc, isActive: false, supersededAt: new Date().toISOString() };
 }
 return doc;
 });
 }

 // Append new document
 updatedDocs.unshift(data.document);
 setDocuments(updatedDocs);

 // Reset additional form if applicable
 if (slotKey === 'additional') {
 setAdditionalTitle('');
 setAdditionalFile(null);
 // Clear input element
 const input = document.getElementById('additional-file-input') as HTMLInputElement;
 if (input) input.value = '';
 }
 } catch (err: any) {
 setUploadError(err.message || 'An error occurred during upload.');
 } finally {
 setUploadingSlot(null);
 }
 };

 const handleDelete = async (docId: string) => {
 if (!confirm('Are you sure you want to permanently delete this document?')) return;
 setDeletingId(docId);
 setUploadError(null);

 try {
 const res = await deleteDocument(docId, orderId, adminId);
 if (res.success) {
 setDocuments((prev) => prev.filter((d) => d.id !== docId));
 } else {
 setUploadError(res.error || 'Failed to delete document.');
 }
 } catch (err: any) {
 setUploadError(err.message || 'An error occurred during deletion.');
 } finally {
 setDeletingId(null);
 }
 };

 const formatSize = (bytes: number | null): string => {
 if (bytes === null) return '—';
 const kb = bytes / 1024;
 if (kb < 1024) return `${kb.toFixed(1)} KB`;
 const mb = kb / 1024;
 return `${mb.toFixed(1)} MB`;
 };

 const renderSlot = (slotKey: string, label: string) => {
 const latestDoc = getLatestForSlot(slotKey);
 const supersededDocs = getSupersededForSlot(slotKey);
 const isUploading = uploadingSlot === slotKey;

 return (
 <div className="bg-gray-50/30 border border-gray-100 rounded-2xl p-5 space-y-4 font-inter">
 <div className="flex items-center justify-between border-b border-gray-100 pb-3">
 <div className="flex items-center gap-2">
 <div className="bg-[#34088f]/10 p-2 rounded-full">
 <FileText className="w-4 h-4 text-[#34088f]" />
 </div>
 <div>
 <h5 className="text-xs font-bold text-gray-800">{label}</h5>
 {latestDoc ? (
 <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-wider mt-0.5">
 <CheckCircle2 className="w-3 h-3" /> Active / Uploaded
 </span>
 ) : (
 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
 Awaiting Upload
 </span>
 )}
 </div>
 </div>

 {/* Upload trigger */}
 <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full text-[10px] font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-sm font-manrope">
 {isUploading ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin text-[#34088f]" />
 ) : (
 <UploadCloud className="w-3.5 h-3.5 text-gray-500" />
 )}
 {isUploading ? 'Uploading...' : 'Upload'}
 <input
 type="file"
 disabled={isUploading}
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleUpload(slotKey, file);
 }}
 className="hidden"
 />
 </label>
 </div>

 {/* Latest Active Document Details */}
 {latestDoc ? (
 <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm">
 <div className="min-w-0 flex-1 pr-4">
 <p className="text-xs font-bold text-gray-900 truncate">{latestDoc.fileName}</p>
 <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
 Size: {formatSize(latestDoc.fileSize)} • Uploaded at {new Date(latestDoc.uploadedAt).toLocaleDateString()}
 </p>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <a
 href={latestDoc.url}
 target="_blank"
 rel="noreferrer"
 className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
 title="Preview Document"
 >
 <Eye className="w-4 h-4" />
 </a>
 <button
 type="button"
 onClick={() => triggerDocumentDownload(latestDoc.url, latestDoc.fileName)}
 className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
 title="Download Document"
 >
 <Download className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDelete(latestDoc.id)}
 disabled={deletingId === latestDoc.id}
 className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-all disabled:opacity-50"
 title="Delete Document"
 >
 {deletingId === latestDoc.id ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Trash2 className="w-4 h-4" />
 )}
 </button>
 </div>
 </div>
 ) : (
 <p className="text-xs text-gray-400 italic font-inter px-1">No document uploaded in this slot</p>
 )}

 {/* Version History List (Superseded versions) */}
 {supersededDocs.length > 0 && (
 <div className="border-t border-gray-100 pt-3 space-y-2">
 <h6 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
 <Calendar className="w-3 h-3" /> Version History
 </h6>
 <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
 {supersededDocs.map((doc) => (
 <div
 key={doc.id}
 className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100/60"
 >
 <div className="min-w-0 flex-1 pr-3">
 <p className="text-[10px] font-semibold text-gray-500 truncate line-through">
 {doc.fileName}
 </p>
 <p className="text-[8px] text-gray-400 mt-0.5">
 Superseded at {new Date(doc.supersededAt || '').toLocaleDateString()}
 </p>
 </div>
 <div className="flex items-center gap-1">
 <a
 href={doc.url}
 target="_blank"
 rel="noreferrer"
 className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
 title="Preview Old Version"
 >
 <Eye className="w-3.5 h-3.5" />
 </a>
 <button
 type="button"
 onClick={() => triggerDocumentDownload(doc.url, doc.fileName)}
 className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"
 title="Download Old Version"
 >
 <Download className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => handleDelete(doc.id)}
 disabled={deletingId === doc.id}
 className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all disabled:opacity-50"
 title="Delete Old Version"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
 };

 const isUploadingAdditional = uploadingSlot === 'additional';

 return (
 <article
 aria-label="Documents vault"
 className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
 >
 {/* Header */}
 <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
 <Files className="w-5 h-5 text-[#34088f]" />
 <h4 className="text-sm font-bold font-manrope text-gray-900 uppercase tracking-wider">
 2. Official Documents & File Vault
 </h4>
 </div>

 {/* Upload Error Banner */}
 {uploadError && (
 <div className="bg-red-50 text-red-700 text-xs font-bold p-3.5 rounded-full border border-red-100 mb-6 font-inter">
 {uploadError}
 </div>
 )}

 {/* Grid of Fixed Slots */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {renderSlot('articles_of_organization', 'Articles of Organization')}
 {renderSlot('operating_agreement', 'Operating Agreement')}
 {renderSlot('ein_letter', 'EIN Confirmation Letter')}
 </div>

 {/* Section 2: Additional Documents List */}
 <div className="mt-8 border-t border-gray-100 pt-6 space-y-4">
 <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-manrope">
 Additional Documents
 </h5>

 {/* Inline Custom Upload Form */}
 <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col md:flex-row items-end gap-4 max-w-3xl">
 <div className="flex-1 w-full">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-inter">
 Document Title
 </label>
 <input
 type="text"
 placeholder="e.g. Bank Resolution, Seller Permit"
 value={additionalTitle}
 onChange={(e) => setAdditionalTitle(e.target.value)}
 className="mt-1.5 block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all"
 />
 </div>

 <div className="w-full md:w-auto">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-inter block mb-1.5">
 Select File
 </label>
 <input
 type="file"
 id="additional-file-input"
 onChange={(e) => setAdditionalFile(e.target.files?.[0] || null)}
 className="block w-full text-xs text-gray-500 font-inter file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-[#34088f]/10 file:text-[#34088f] hover:file:bg-[#34088f]/20 cursor-pointer"
 />
 </div>

 <button
 onClick={() => {
 if (additionalFile && additionalTitle.trim()) {
 handleUpload('additional', additionalFile, additionalTitle.trim());
 }
 }}
 disabled={!additionalFile || !additionalTitle.trim() || isUploadingAdditional}
 className="w-full md:w-auto flex items-center justify-center gap-1.5 h-10 px-6 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-40 transition-all font-manrope shadow-sm shrink-0"
 >
 {isUploadingAdditional ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 ) : (
 <UploadCloud className="w-3.5 h-3.5" />
 )}
 Upload Add-on File
 </button>
 </div>

 {/* Additional Document List Display */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {getAdditionalDocs().length > 0 ? (
 getAdditionalDocs().map((doc) => (
 <div
 key={doc.id}
 className="flex items-center justify-between bg-white px-4 py-3.5 rounded-2xl border border-gray-100 shadow-sm font-inter"
 >
 <div className="min-w-0 flex-1 pr-4">
 <p className="text-xs font-bold text-gray-900">{doc.documentType}</p>
 <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">
 {doc.fileName} • {formatSize(doc.fileSize)}
 </p>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <a
 href={doc.url}
 target="_blank"
 rel="noreferrer"
 className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
 title="Preview"
 >
 <Eye className="w-4 h-4" />
 </a>
 <button
 type="button"
 onClick={() => triggerDocumentDownload(doc.url, doc.fileName)}
 className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
 title="Download"
 >
 <Download className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDelete(doc.id)}
 disabled={deletingId === doc.id}
 className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-all disabled:opacity-50"
 title="Delete"
 >
 {deletingId === doc.id ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Trash2 className="w-4 h-4" />
 )}
 </button>
 </div>
 </div>
 ))
 ) : (
 <p className="text-xs text-gray-400 italic font-inter px-1 md:col-span-2">
 No additional documents uploaded yet.
 </p>
 )}
 </div>
 </div>
 </article>
 );
}
