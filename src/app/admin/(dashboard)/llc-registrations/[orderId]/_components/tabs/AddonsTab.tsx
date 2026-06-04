'use client';

import React, { useState } from 'react';
import { Plus, X, Save, Edit2, Loader2, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { updateOrderAddons } from '@/lib/admin/actions/updateOrderAddons';
import { addInternalAddon } from '@/lib/admin/actions/addInternalAddon';
import { removeInternalAddon } from '@/lib/admin/actions/removeInternalAddon';
import { updateInternalAddon } from '@/lib/admin/actions/updateInternalAddon';
import { ADDON_REGISTRY } from '@/lib/pricing';
import type { OrderDetail, Addon, InternalAddon } from '@/types/admin';

interface AddonsTabProps {
  order: OrderDetail;
  allAddons: Addon[];
  internalAddons: InternalAddon[];
  adminId: string;
  onSaved: () => void;
}

function AddonStatusBadge({ status }: { status?: string | null }) {
  const styles: Record<string, string> = {
    active:   'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    pending:  'bg-amber-100 text-amber-700',
  };
  const s = status ?? 'active';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[s] ?? styles.active}`}>
      {s}
    </span>
  );
}

export function AddonsTab({ order, allAddons, internalAddons, adminId, onSaved }: AddonsTabProps) {
  // ── Customer selected addons ─────────────────────────────────────────────────
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(order.selectedAddons ?? []);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const getAddonMeta = (id: string) => {
    const db = allAddons.find(a => a.id === id);
    if (db) return { title: db.name, price: db.price, billingLabel: 'One-time' };
    const legacy = (ADDON_REGISTRY as any)[id];
    if (legacy) return { title: legacy.title, price: legacy.price, billingLabel: legacy.billingLabel };
    return null;
  };

  const handleSaveCustomer = async () => {
    setSavingCustomer(true); setCustomerError(null);
    const res = await updateOrderAddons(order.id, selectedIds);
    setSavingCustomer(false);
    if (res.success) { setEditingCustomer(false); onSaved(); }
    else setCustomerError(res.error ?? 'Save failed');
  };

  // ── Internal addons ───────────────────────────────────────────────────────────
  const [showAssign, setShowAssign] = useState(false);
  const [assignAddonId, setAssignAddonId] = useState('');
  const [assignDescription, setAssignDescription] = useState('');
  const [assignStatus, setAssignStatus] = useState('active');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const activeInternalAddons = internalAddons.filter(a => !a.removedAt);
  const assignedAddonIds = new Set(activeInternalAddons.map(a => a.addonId).filter(Boolean));
  const availableAddons = allAddons.filter(a => a.status === 'published' && !assignedAddonIds.has(a.id));

  const handleAssign = async () => {
    if (!assignAddonId) { setAssignError('Select an add-on'); return; }
    setAssigning(true); setAssignError(null);
    const selectedAddon = allAddons.find(a => a.id === assignAddonId);
    if (!selectedAddon) { setAssigning(false); setAssignError('Add-on not found'); return; }
    const res = await addInternalAddon({
      orderId: order.id,
      adminId,
      addonId: assignAddonId,
      addonName: selectedAddon.name,
      addonPrice: selectedAddon.price,
      description: assignDescription || undefined,
    });
    setAssigning(false);
    if (res.success) {
      setShowAssign(false); setAssignAddonId(''); setAssignDescription(''); setAssignStatus('active');
      onSaved();
    } else setAssignError(res.error ?? 'Failed to assign');
  };

  const handleRemoveInternal = async (addonAssignmentId: string) => {
    await removeInternalAddon(addonAssignmentId, order.id, adminId);
    onSaved();
  };

  // Inline edit for internal addon description/status
  const [editingInternal, setEditingInternal] = useState<string | null>(null);
  const [internalEditDesc, setInternalEditDesc] = useState('');
  const [internalEditStatus, setInternalEditStatus] = useState('');
  const [savingInternal, setSavingInternal] = useState(false);

  const startEditInternal = (addon: InternalAddon) => {
    setEditingInternal(addon.id);
    setInternalEditDesc(addon.description ?? '');
    setInternalEditStatus(('status' in addon ? (addon as any).status : null) ?? 'active');
  };

  const saveInternal = async (addonId: string) => {
    setSavingInternal(true);
    await updateInternalAddon(addonId, order.id, { description: internalEditDesc, status: internalEditStatus });
    setSavingInternal(false);
    setEditingInternal(null);
    onSaved();
  };

  const INPUT_CLS = 'block w-full h-9 px-3 bg-white border border-[#e5e7eb] rounded-lg text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all';
  const SELECT_CLS = 'block w-full h-9 pl-3 pr-8 bg-white border border-[#e5e7eb] rounded-lg text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all appearance-none';

  return (
    <div className="space-y-6">
      {/* ── Customer-Selected Add-ons ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-900 font-manrope">Customer-Selected Add-ons</h3>
          {!editingCustomer ? (
            <button onClick={() => setEditingCustomer(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all font-manrope">
              <Edit2 className="w-3.5 h-3.5 text-gray-500" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {customerError && <span className="text-xs text-red-600 font-semibold font-inter">{customerError}</span>}
              <button onClick={handleSaveCustomer} disabled={savingCustomer}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
                <Save className="w-3.5 h-3.5" /> {savingCustomer ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setSelectedIds(order.selectedAddons ?? []); setEditingCustomer(false); setCustomerError(null); }}
                className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          )}
        </div>

        {!editingCustomer ? (
          order.selectedAddons?.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 font-inter bg-white rounded-2xl border border-gray-100">No add-ons selected.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {order.selectedAddons.map(id => {
                const meta = getAddonMeta(id);
                if (!meta) return null;
                return (
                  <div key={id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-gray-900 font-manrope">{meta.title}</p>
                      <span className="text-xs font-bold text-[#34088f] font-manrope">${meta.price}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-inter">{meta.billingLabel}</p>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allAddons.filter(a => a.status === 'published').map(addon => {
              const checked = selectedIds.includes(addon.id);
              return (
                <label key={addon.id} className={`flex items-start gap-3 border p-4 rounded-xl cursor-pointer transition-all ${checked ? 'border-[#34088f] bg-[#34088f]/5' : 'border-[#ebebeb] hover:border-gray-300 bg-white'}`}>
                  <input type="checkbox" checked={checked}
                    onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, addon.id] : prev.filter(x => x !== addon.id))}
                    className="mt-0.5 h-4 w-4 accent-[#34088f]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 font-manrope truncate">{addon.name}</span>
                      <span className="text-xs font-bold text-[#34088f] ml-2">${addon.price}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-inter mt-0.5 truncate">{addon.features?.[0] ?? 'Premium service'}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Admin-Assigned Internal Add-ons ──────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-900 font-manrope">Admin-Assigned Add-ons</h3>
          <button onClick={() => setShowAssign(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] transition-all font-manrope">
            <Plus className="w-3.5 h-3.5" /> Assign New Add-on
          </button>
        </div>

        {/* Assign modal */}
        {showAssign && (
          <div className="bg-white rounded-2xl border border-[#34088f]/20 shadow-sm p-5 mb-4">
            <p className="text-sm font-black text-gray-900 font-manrope mb-4">Assign New Add-on</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Add-on</label>
                <div className="relative">
                  <select className={SELECT_CLS} value={assignAddonId} onChange={e => setAssignAddonId(e.target.value)}>
                    <option value="">— Select Add-on —</option>
                    {availableAddons.map(a => <option key={a.id} value={a.id}>{a.name} (${a.price})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Status</label>
                <div className="relative">
                  <select className={SELECT_CLS} value={assignStatus} onChange={e => setAssignStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Description (Optional)</label>
                <input className={INPUT_CLS} value={assignDescription} onChange={e => setAssignDescription(e.target.value)} placeholder="Internal note or description" />
              </div>
            </div>
            {assignError && <p className="text-xs text-red-600 font-semibold mb-3 font-inter">{assignError}</p>}
            <div className="flex items-center gap-2">
              <button onClick={handleAssign} disabled={assigning}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
                {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Assign
              </button>
              <button onClick={() => { setShowAssign(false); setAssignAddonId(''); setAssignDescription(''); setAssignError(null); }}
                className="px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope">
                Cancel
              </button>
            </div>
          </div>
        )}

        {activeInternalAddons.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 font-inter bg-white rounded-2xl border border-gray-100">No internal add-ons assigned.</div>
        ) : (
          <div className="space-y-3">
            {activeInternalAddons.map(addon => (
              <div key={addon.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-[#34088f]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-900 font-manrope">{addon.addonName}</p>
                        <AddonStatusBadge status={(addon as any).status} />
                      </div>
                      {editingInternal === addon.id ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input value={internalEditDesc} onChange={e => setInternalEditDesc(e.target.value)}
                            placeholder="Description" className="flex-1 h-7 px-2 text-xs border border-[#e5e7eb] rounded-lg outline-none focus:border-[#34088f] font-inter" />
                          <div className="relative">
                            <select value={internalEditStatus} onChange={e => setInternalEditStatus(e.target.value)}
                              className="h-7 pl-2 pr-6 text-xs border border-[#e5e7eb] rounded-lg outline-none focus:border-[#34088f] font-inter appearance-none">
                              <option value="active">Active</option>
                              <option value="pending">Pending</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                          <button onClick={() => saveInternal(addon.id)} disabled={savingInternal}
                            className="p-1.5 rounded-lg bg-[#34088f] text-white hover:bg-[#2d077c] disabled:opacity-50">
                            {savingInternal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          </button>
                          <button onClick={() => setEditingInternal(null)} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        addon.description && <p className="text-[10px] text-gray-500 font-inter mt-0.5 truncate">{addon.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-[#34088f] font-manrope">${addon.addonPrice}</span>
                    {editingInternal !== addon.id && (
                      <button onClick={() => startEditInternal(addon)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#34088f] transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleRemoveInternal(addon.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
