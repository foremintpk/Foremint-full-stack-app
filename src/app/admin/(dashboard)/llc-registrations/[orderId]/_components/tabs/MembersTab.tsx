'use client';

import React, { useState } from 'react';
import { User, Upload, Eye, Download, Trash2, Plus, Loader2, X, Save, Send } from 'lucide-react';
import { addOrderMember, deleteOrderMember } from '@/lib/admin/actions/manageOrderMembers';
import { deleteDocument } from '@/lib/admin/actions/deleteDocument';
import { requestDocumentResubmission } from '@/lib/admin/actions/requestDocumentResubmission';
import { triggerDocumentDownload } from '@/lib/download-file';
import type { OrderDetail, OrderMember } from '@/types/admin';

interface MembersTabProps {
  order: OrderDetail;
  adminId: string;
  onSaved: () => void;
}

async function uploadMemberDoc(orderId: string, adminId: string, file: File, slotKey: string): Promise<{ success: boolean; error?: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('slotKey', slotKey);
  fd.append('adminId', adminId);
  const res = await fetch(`/api/admin/orders/${orderId}/documents`, { method: 'POST', body: fd });
  if (!res.ok) { const d = await res.json(); return { success: false, error: d.error ?? 'Upload failed' }; }
  return { success: true };
}

function MemberCard({
  member, orderId, adminId, onChanged,
}: {
  member: OrderMember; orderId: string; adminId: string; onChanged: () => void;
}) {
  // adminId is passed but used via closure in handleRequestResubmission
  const [uploading, setUploading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slotKey = `member_${member.index}_passport`;

  const handleUpload = async (file: File) => {
    setUploading(true); setError(null);
    const res = await uploadMemberDoc(orderId, adminId, file, slotKey);
    setUploading(false);
    if (!res.success) setError(res.error ?? 'Upload failed');
    else onChanged();
  };

  const handleRequestResubmission = async () => {
    setRequesting(true);
    await requestDocumentResubmission(orderId, member.index, 'id_document', adminId, false, 'Please upload a valid identity document');
    setRequesting(false);
    onChanged();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#34088f]/10 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-[#34088f]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-gray-900 font-manrope">{member.name}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#34088f]/10 text-[#34088f] font-manrope">
              {member.position}
            </span>
            {member.hasResubmitRequest && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-600 font-manrope">
                Resubmit Requested
              </span>
            )}
          </div>
          {member.address && (
            <p className="text-xs text-gray-500 font-inter">
              {[member.address, member.city, member.state, member.country].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Identity document */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {member.idDocUrl ? (
              <>
                <a href={member.idDocUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34088f]/5 text-[#34088f] rounded-full text-xs font-semibold hover:bg-[#34088f]/10 transition-colors font-inter">
                  <Eye className="w-3 h-3" /> View ID
                </a>
                <button type="button" onClick={() => { void triggerDocumentDownload(member.idDocUrl ?? '', `${member.name}-id-document`); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full text-xs font-semibold hover:bg-gray-50 transition-colors font-inter">
                  <Download className="w-3 h-3" /> Download
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-full text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer font-inter">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Replace
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                </label>
              </>
            ) : (
              <>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] transition-colors cursor-pointer font-manrope">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload ID
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                </label>
                {!member.hasResubmitRequest && (
                  <button onClick={handleRequestResubmission} disabled={requesting}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-300 text-orange-600 rounded-full text-xs font-bold hover:bg-orange-50 transition-colors disabled:opacity-50 font-manrope">
                    {requesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Request Document
                  </button>
                )}
              </>
            )}
          </div>
          {error && <p className="text-xs text-red-600 font-semibold mt-1.5 font-inter">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function MembersTab({ order, adminId, onSaved }: MembersTabProps) {
  const snapshot = (order.formSnapshot as any) || {};
  const memberType = order.memberType ?? snapshot?.memberType ?? 'single-member';
  const isMultiMember = memberType === 'multi-member' || memberType === 'multi';

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newSsn, setNewSsn] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  const handleAddMember = async () => {
    if (!newName.trim()) { setAddError('Full name is required'); return; }
    setAdding(true); setAddError(null);
    const res = await addOrderMember(order.id, { fullName: newName.trim(), address: newAddress.trim(), ssn: newSsn.trim() });
    setAdding(false);
    if (res.success) {
      setNewName(''); setNewAddress(''); setNewSsn('');
      setShowAddForm(false); onSaved();
    } else setAddError(res.error ?? 'Failed to add member');
  };

  const handleDeleteMember = async (idx: number) => {
    setDeletingIdx(idx);
    await deleteOrderMember(order.id, idx);
    setDeletingIdx(null);
    onSaved();
  };

  const INPUT_CLS = 'block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all';

  return (
    <div className="space-y-5">
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
            <Plus className="w-3.5 h-3.5" /> Add New Member
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
              <input className={INPUT_CLS} value={newName} onChange={e => setNewName(e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">SSN / ITIN</label>
              <input className={INPUT_CLS} value={newSsn} onChange={e => setNewSsn(e.target.value)} placeholder="XXX-XX-XXXX" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Address</label>
              <input className={INPUT_CLS} value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Full address" />
            </div>
          </div>
          {addError && <p className="text-xs text-red-600 font-semibold mb-3 font-inter">{addError}</p>}
          <div className="flex items-center gap-2">
            <button onClick={handleAddMember} disabled={adding}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Member
            </button>
            <button onClick={() => { setShowAddForm(false); setAddError(null); }}
              className="px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      {order.members.length === 0 ? (
        <div className="text-center py-12 text-xs text-gray-400 font-inter bg-white rounded-2xl border border-gray-100">
          No members found. Member data is derived from the onboarding form.
        </div>
      ) : (
        <div className="space-y-3">
          {order.members.map((member, idx) => (
            <div key={member.index} className="relative">
              <MemberCard member={member} orderId={order.id} adminId={adminId} onChanged={onSaved} />
              {isMultiMember && order.members.length > 1 && (
                <button
                  onClick={() => handleDeleteMember(idx)}
                  disabled={deletingIdx === idx}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Remove member"
                >
                  {deletingIdx === idx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





