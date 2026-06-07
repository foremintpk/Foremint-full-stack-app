'use client';

import React, { useState, useRef } from 'react';
import { User, Upload, Eye, Download, Plus, Loader2, X, Save, Edit2, Check } from 'lucide-react';
import { addOrderMember, deleteOrderMember, updateOrderMemberAt } from '@/lib/admin/actions/manageOrderMembers';
import type { OrderDetail, OrderMember } from '@/types/admin';

interface MembersTabProps {
  order: OrderDetail;
  adminId: string;
  onSaved: () => void;
}

async function uploadMemberDoc(
  orderId: string, adminId: string, file: File, slotKey: string
): Promise<{ success: boolean; error?: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('slotKey', slotKey);
  fd.append('adminId', adminId);
  const res = await fetch(`/api/admin/orders/${orderId}/documents`, { method: 'POST', body: fd });
  if (!res.ok) { const d = await res.json(); return { success: false, error: d.error ?? 'Upload failed' }; }
  return { success: true };
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({
  member, orderId, adminId, canDelete, onChanged, onDelete,
}: {
  member: OrderMember; orderId: string; adminId: string;
  canDelete: boolean; onChanged: () => void; onDelete: () => void;
}) {
  const slotKey = `member_${member.index}_passport`;
  const uploadRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(member.name);
  const [editAddress, setEditAddress] = useState(
    [member.address, member.city, member.state, member.country].filter(Boolean).join(', ')
  );
  const [editSsn, setEditSsn] = useState(member.ssnItin ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fullAddress = [member.address, member.city, member.state, member.country]
    .filter(Boolean).join(', ');

  const handleUpload = async (file: File) => {
    setUploading(true); setUploadError(null);
    const res = await uploadMemberDoc(orderId, adminId, file, slotKey);
    setUploading(false);
    if (!res.success) setUploadError(res.error ?? 'Upload failed');
    else onChanged();
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) { setSaveError('Name is required'); return; }
    setSaving(true); setSaveError(null);
    const res = await updateOrderMemberAt(orderId, member.index, {
      fullName: editName.trim(),
      address: editAddress.trim(),
      ssnItin: editSsn.trim(),
    });
    setSaving(false);
    if (res.success) { setEditing(false); onChanged(); }
    else setSaveError(res.error ?? 'Save failed');
  };

  const INPUT = 'w-full h-9 px-3 bg-white border border-[#e5e7eb] rounded-xl text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-[#34088f]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900 font-manrope truncate">{member.name}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#34088f]/10 text-[#34088f]">
                {member.position}
              </span>
              {member.hasResubmitRequest && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-600">
                  Resubmit Requested
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#34088f] transition-colors" title="Edit">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors" title="Remove">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        /* Edit form */
        <div className="space-y-2.5 mb-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Full Name</label>
            <input className={INPUT} value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Address</label>
            <input className={INPUT} value={editAddress} onChange={e => setEditAddress(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">SSN / ITIN</label>
            <input className={INPUT} value={editSsn} onChange={e => setEditSsn(e.target.value)} placeholder="XXX-XX-XXXX" />
          </div>
          {saveError && <p className="text-xs text-red-600 font-semibold font-inter">{saveError}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={handleSaveEdit} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
            <button onClick={() => { setEditing(false); setSaveError(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Info rows */
        <div className="space-y-1.5 mb-4">
          <InfoRow label="Address" value={fullAddress || '—'} />
          <InfoRow label="SSN / ITIN" value={member.ssnItin || '—'} />
        </div>
      )}

      {/* Document section */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-2">Identity Document</p>
        <input ref={uploadRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />

        {member.idDocId ? (
          <div className="flex items-center gap-2 flex-wrap">
            <a href={`/api/documents/${member.idDocId}/view`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34088f]/5 text-[#34088f] rounded-full text-xs font-semibold hover:bg-[#34088f]/10 transition-colors">
              <Eye className="w-3 h-3" /> View ID
            </a>
            <a href={`/api/documents/${member.idDocId}/view?download=1`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full text-xs font-semibold hover:bg-gray-50 transition-colors">
              <Download className="w-3 h-3" /> Download
            </a>
            <button onClick={() => uploadRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Replace
            </button>
          </div>
        ) : (
          <button onClick={() => uploadRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-colors">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload ID
          </button>
        )}
        {uploadError && <p className="text-xs text-red-600 font-semibold mt-1.5 font-inter">{uploadError}</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs font-inter">
      <span className="text-gray-400 font-semibold w-20 flex-shrink-0">{label}:</span>
      <span className="text-gray-700 font-semibold">{value}</span>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function MembersTab({ order, adminId, onSaved }: MembersTabProps) {
  const snapshot = (order.formSnapshot as any) || {};
  const memberType = order.memberType ?? snapshot?.memberType ?? 'single-member';
  const isMultiMember = memberType === 'multi-member' || memberType === 'multi';

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newSsn, setNewSsn] = useState('');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  const handleAddMember = async () => {
    if (!newName.trim()) { setAddError('Full name is required'); return; }
    setAdding(true); setAddError(null);
    const res = await addOrderMember(order.id, { fullName: newName.trim(), address: newAddress.trim(), ssnItin: newSsn.trim() });
    if (!res.success) { setAdding(false); setAddError(res.error ?? 'Failed to add member'); return; }

    // Upload doc if provided
    if (newDocFile && res.memberIndex !== undefined) {
      const slotKey = `member_${res.memberIndex}_passport`;
      await uploadMemberDoc(order.id, adminId, newDocFile, slotKey);
    }

    setAdding(false);
    setNewName(''); setNewAddress(''); setNewSsn(''); setNewDocFile(null);
    setShowAddForm(false);
    onSaved();
  };

  const handleDeleteMember = async (idx: number) => {
    setDeletingIdx(idx);
    await deleteOrderMember(order.id, idx);
    setDeletingIdx(null);
    onSaved();
  };

  const INPUT = 'block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-gray-900 font-manrope">
            Members <span className="text-gray-400 font-normal">({order.members.length})</span>
          </h3>
          <p className="text-xs text-gray-400 font-inter mt-0.5">
            {isMultiMember ? 'Multi-member LLC' : 'Single-member LLC'}
          </p>
        </div>
        {isMultiMember && !showAddForm && (
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] transition-all font-manrope">
            <Plus className="w-3.5 h-3.5" /> Add Member
          </button>
        )}
      </div>

      {/* Add member form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-[#34088f]/20 shadow-sm p-5">
          <p className="text-sm font-black text-gray-900 font-manrope mb-4">New Member</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Full Name *</label>
              <input className={INPUT} value={newName} onChange={e => setNewName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">SSN / ITIN</label>
              <input className={INPUT} value={newSsn} onChange={e => setNewSsn(e.target.value)} placeholder="XXX-XX-XXXX" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Address</label>
              <input className={INPUT} value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Full address" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">ID Document (Optional)</label>
              <input ref={docInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => setNewDocFile(e.target.files?.[0] ?? null)} />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => docInputRef.current?.click()}
                  className="flex items-center gap-2 h-10 px-4 border border-[#e5e7eb] rounded-full text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-all font-inter">
                  <Upload className="w-3.5 h-3.5 text-gray-400" />
                  {newDocFile ? newDocFile.name : 'Choose File'}
                </button>
                {newDocFile && (
                  <button onClick={() => setNewDocFile(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {addError && <p className="text-xs text-red-600 font-semibold mb-3 font-inter">{addError}</p>}
          <div className="flex items-center gap-2">
            <button onClick={handleAddMember} disabled={adding}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Member
            </button>
            <button onClick={() => { setShowAddForm(false); setAddError(null); setNewDocFile(null); }}
              className="px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Members grid */}
      {order.members.length === 0 ? (
        <div className="text-center py-12 text-xs text-gray-400 font-inter bg-white rounded-2xl border border-gray-100">
          No members found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {order.members.map((member, idx) => (
            <MemberCard
              key={member.index}
              member={member}
              orderId={order.id}
              adminId={adminId}
              canDelete={isMultiMember && order.members.length > 1}
              onChanged={onSaved}
              onDelete={() => handleDeleteMember(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
