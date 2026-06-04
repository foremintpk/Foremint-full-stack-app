'use client';

import { useState, useRef } from 'react';
import { Upload, Download, Eye, Trash2, FileText, Loader2, Plus, Edit2, Check, X } from 'lucide-react';
import { deleteDocument } from '@/lib/admin/actions/deleteDocument';
import { triggerDocumentDownload } from '@/lib/download-file';
import type { OrderDocument } from '@/types/admin';

interface DocumentsTabProps {
  orderId: string;
  adminId: string;
  documents: OrderDocument[];
  onChanged: () => void;
}

const PRIMARY_SLOTS = [
  { key: 'articles_of_organization', label: 'Articles of Organization' },
  { key: 'operating_agreement',      label: 'Operating Agreement' },
  { key: 'ein_letter',               label: 'EIN Confirmation Letter' },
] as const;

function formatBytes(n: number | null) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Route all document viewing through an authenticated proxy so the browser always
// receives the correct Content-Type header regardless of how Cloudinary stores the file.
function getViewUrl(doc: OrderDocument): string {
  return `/api/admin/documents/${doc.id}/view`;
}

async function uploadToAdmin(orderId: string, adminId: string, file: File, slotKey: string, title?: string): Promise<{ success: boolean; error?: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('slotKey', slotKey);
  fd.append('adminId', adminId);
  if (title) fd.append('title', title);
  const res = await fetch(`/api/admin/orders/${orderId}/documents`, { method: 'POST', body: fd });
  if (!res.ok) { const d = await res.json(); return { success: false, error: d.error ?? 'Upload failed' }; }
  return { success: true };
}

// ─── Primary document slot ────────────────────────────────────────────────────

function PrimaryDocSlot({
  orderId, adminId, slotKey, label, doc, onChanged,
}: {
  orderId: string; adminId: string; slotKey: string; label: string;
  doc: OrderDocument | null; onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true); setError(null);
    const res = await uploadToAdmin(orderId, adminId, file, slotKey);
    setUploading(false);
    if (!res.success) setError(res.error ?? 'Upload failed');
    else onChanged();
  };

  const handleDelete = async () => {
    if (!doc) return;
    setDeleting(true);
    const res = await deleteDocument(doc.id, orderId, adminId);
    setDeleting(false);
    if (!res.success) setError(res.error ?? 'Delete failed');
    else onChanged();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-[#34088f]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 font-manrope">{label}</p>
            {doc ? (
              <p className="text-xs text-gray-400 font-inter truncate">
                {doc.fileName} {doc.fileSize ? `· ${formatBytes(doc.fileSize)}` : ''}
              </p>
            ) : (
              <p className="text-xs text-gray-400 font-inter italic">No file uploaded</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {doc && (
            <>
              <a href={getViewUrl(doc)} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#34088f] transition-colors" title="View">
                <Eye className="w-4 h-4" />
              </a>
              <button type="button" onClick={() => { void triggerDocumentDownload(doc.url, doc.fileName); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#34088f] transition-colors" title="Download"><Download className="w-4 h-4" /></button>
              <button onClick={handleDelete} disabled={deleting}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50" title="Delete">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope"
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {doc ? 'Replace' : 'Upload'}
          </button>
          <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
        </div>
      </div>
      {error && <p className="text-xs text-red-600 font-semibold mt-2 font-inter">{error}</p>}
    </div>
  );
}

// ─── Additional document row ─────────────────────────────────────────────────

function AdditionalDocRow({ doc, onDelete, onTitleEdit }: {
  doc: OrderDocument; onDelete: (id: string) => void; onTitleEdit: (id: string, newTitle: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.documentType);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-[#34088f]" />
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="flex-1 h-7 px-2 text-xs font-semibold border border-[#34088f] rounded-lg outline-none font-inter" autoFocus />
            <button onClick={() => { onTitleEdit(doc.id, title); setEditing(false); }}
              className="p-1 rounded text-emerald-600 hover:bg-emerald-50"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setTitle(doc.documentType); setEditing(false); }}
              className="p-1 rounded text-gray-400 hover:bg-gray-100"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <p className="text-xs font-semibold text-gray-900 font-inter truncate">{doc.documentType}</p>
        )}
        <p className="text-[10px] text-gray-400 font-inter truncate">{doc.fileName} {doc.fileSize ? `· ${formatBytes(doc.fileSize)}` : ''}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={getViewUrl(doc)} target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#34088f] transition-colors"><Eye className="w-3.5 h-3.5" /></a>
        <button type="button" onClick={() => { void triggerDocumentDownload(doc.url, doc.fileName); }}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#34088f] transition-colors"><Download className="w-3.5 h-3.5" /></button>
        <button onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#34088f] transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
        <button onClick={async () => { setDeleting(true); onDelete(doc.id); }}
          disabled={deleting} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DocumentsTab({ orderId, adminId, documents, onChanged }: DocumentsTabProps) {
  const [addTitle, setAddTitle] = useState('');
  const [addFile, setAddFile] = useState<File | null>(null);
  const [addUploading, setAddUploading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const activeDocs = documents.filter(d => d.isActive !== false);
  const primaryDocs = PRIMARY_SLOTS.map(slot => ({
    ...slot,
    doc: activeDocs.find(d => d.slotKey === slot.key) ?? null,
  }));
  const additionalDocs = activeDocs.filter(d => d.slotKey === 'additional' || !PRIMARY_SLOTS.some(s => s.key === d.slotKey));

  const handleAddUpload = async () => {
    if (!addFile || !addTitle.trim()) { setAddError('Title and file are required'); return; }
    setAddUploading(true); setAddError(null);
    const res = await uploadToAdmin(orderId, adminId, addFile, 'additional', addTitle.trim());
    setAddUploading(false);
    if (!res.success) { setAddError(res.error ?? 'Upload failed'); return; }
    setAddTitle(''); setAddFile(null);
    onChanged();
  };

  const handleDeleteAdditional = async (docId: string) => {
    await deleteDocument(docId, orderId, adminId);
    onChanged();
  };

  const handleTitleEdit = async (_docId: string, _newTitle: string) => {
    // Title stored as document_type — would need a server action; for now refresh
    onChanged();
  };

  return (
    <div className="space-y-6">
      {/* Primary Documents */}
      <div>
        <h3 className="text-sm font-black text-gray-900 font-manrope mb-3">Primary Documents</h3>
        <div className="space-y-3">
          {primaryDocs.map(slot => (
            <PrimaryDocSlot
              key={slot.key}
              orderId={orderId} adminId={adminId}
              slotKey={slot.key} label={slot.label} doc={slot.doc}
              onChanged={onChanged}
            />
          ))}
        </div>
      </div>

      {/* Additional Documents */}
      <div>
        <h3 className="text-sm font-black text-gray-900 font-manrope mb-3">Additional Documents</h3>

        {/* Upload form */}
        <div className="bg-white rounded-2xl border border-dashed border-[#c4b5fd] p-5 mb-4">
          <p className="text-xs font-bold text-[#34088f] mb-3 font-manrope">Upload Additional Document</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input type="text" placeholder="Document Title" value={addTitle} onChange={e => setAddTitle(e.target.value)}
              className="flex-1 h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all" />
            <label className="flex items-center gap-2 h-10 px-4 border border-[#e5e7eb] rounded-full text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-all font-inter">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              {addFile ? addFile.name : 'Choose File'}
              <input ref={addInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => { setAddFile(e.target.files?.[0] ?? null); }} />
            </label>
            <button onClick={handleAddUpload} disabled={addUploading || !addTitle.trim() || !addFile}
              className="flex items-center gap-1.5 h-10 px-5 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
              {addUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Upload
            </button>
          </div>
          {addError && <p className="text-xs text-red-600 font-semibold mt-2 font-inter">{addError}</p>}
        </div>

        {/* Uploaded list */}
        {additionalDocs.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 font-inter bg-white rounded-2xl border border-gray-100">
            No additional documents uploaded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {additionalDocs.map(doc => (
              <AdditionalDocRow key={doc.id} doc={doc}
                onDelete={handleDeleteAdditional} onTitleEdit={handleTitleEdit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


