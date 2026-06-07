'use client';

import React, { useState } from 'react';
import { Edit2, X, Save, Loader2, Package, Check } from 'lucide-react';
import { updateOrderAddons } from '@/lib/admin/actions/updateOrderAddons';
import { updateAddonStatus } from '@/lib/admin/actions/updateAddonStatus';
import { ADDON_REGISTRY } from '@/lib/pricing';
import type { OrderDetail, Addon } from '@/types/admin';

interface AddonsTabProps {
  order: OrderDetail;
  allAddons: Addon[];
  internalAddons: any[];
  adminId: string;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: 'pending',      label: 'Pending',     color: 'bg-amber-100 text-amber-700' },
  { value: 'in_process',   label: 'In Process',  color: 'bg-blue-100 text-blue-700' },
  { value: 'completed',    label: 'Completed',   color: 'bg-emerald-100 text-emerald-700' },
  { value: 'failed',       label: 'Failed',      color: 'bg-red-100 text-red-700' },
] as const;

function statusStyle(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status)?.color ?? 'bg-gray-100 text-gray-600';
}

function statusLabel(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status)?.label ?? status;
}

// ─── Single addon card ────────────────────────────────────────────────────────

function AddonCard({
  orderId,
  addonId,
  name,
  price,
  features,
  categoryNames,
  snapshot,
  onSaved,
}: {
  orderId: string;
  addonId: string;
  name: string;
  price: number;
  features: string[];
  categoryNames: string[];
  snapshot: Record<string, any>;
  onSaved: () => void;
}) {
  const currentStatus = snapshot.status ?? 'pending';
  const currentDetails = snapshot.details ?? '';

  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [details, setDetails] = useState(currentDetails);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true); setError(null);
    const res = await updateAddonStatus(orderId, addonId, status, details);
    setSaving(false);
    if (res.success) { setEditing(false); onSaved(); }
    else setError(res.error ?? 'Save failed');
  };

  const handleCancel = () => {
    setStatus(currentStatus);
    setDetails(currentDetails);
    setEditing(false);
    setError(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-[#34088f]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 font-manrope truncate">{name}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 ${statusStyle(editing ? status : currentStatus)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {statusLabel(editing ? status : currentStatus)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-lg font-extrabold text-[#34088f] font-manrope">
            ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#34088f] transition-colors"
              title="Edit status"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Details (read-only when not editing) */}
      {!editing && currentDetails && (
        <p className="text-xs text-gray-500 font-inter border-t border-gray-100 pt-3 mt-2">{currentDetails}</p>
      )}

      {/* Edit panel */}
      {editing && (
        <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1.5 block">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    status === opt.value
                      ? `${opt.color} border-current`
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1.5 block">Details / Notes</label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={2}
              placeholder="Add internal notes or updates for this add-on…"
              className="w-full px-3 py-2 text-xs font-inter border border-[#e5e7eb] rounded-xl outline-none focus:border-[#34088f] transition-all resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-600 font-semibold font-inter">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function AddonsTab({ order, allAddons, onSaved }: AddonsTabProps) {
  const [editingList, setEditingList] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(order.selectedAddons ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const getAddonMeta = (id: string) => {
    const db = allAddons.find(a => a.id === id);
    if (db) return {
      name: db.name,
      price: db.price,
      features: db.features ?? [],
      categoryNames: (db.categories ?? []).map(c => c.name),
    };
    const legacy = (ADDON_REGISTRY as any)[id];
    if (legacy) return {
      name: legacy.title,
      price: legacy.price,
      features: legacy.features ?? [],
      categoryNames: [],
    };
    const snap = (order.addonsSnapshot ?? []).find((a: any) => a.id === id);
    if (snap) return {
      name: snap.name ?? snap.title ?? id,
      price: snap.price ?? 0,
      features: [],
      categoryNames: [],
    };
    return null;
  };

  const getSnapshot = (id: string): Record<string, any> => {
    return (order.addonsSnapshot ?? []).find((a: any) => a.id === id) ?? {};
  };

  const handleSaveList = async () => {
    setSaving(true); setSaveError(null);
    const res = await updateOrderAddons(order.id, selectedIds);
    setSaving(false);
    if (res.success) { setEditingList(false); onSaved(); }
    else setSaveError(res.error ?? 'Save failed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-900 font-manrope">Selected Add-ons</h3>
        {!editingList ? (
          <button
            onClick={() => setEditingList(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all font-manrope"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-500" /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {saveError && <span className="text-xs text-red-600 font-semibold font-inter">{saveError}</span>}
            <button
              onClick={handleSaveList}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setSelectedIds(order.selectedAddons ?? []); setEditingList(false); setSaveError(null); }}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Edit mode: checkbox list */}
      {editingList ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allAddons.filter(a => a.status === 'published').map(addon => {
            const checked = selectedIds.includes(addon.id);
            return (
              <label key={addon.id} className={`flex items-start gap-3 border p-4 rounded-2xl cursor-pointer transition-all ${checked ? 'border-[#34088f] bg-[#34088f]/5' : 'border-[#ebebeb] hover:border-gray-300 bg-white'}`}>
                <input type="checkbox" checked={checked}
                  onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, addon.id] : prev.filter(x => x !== addon.id))}
                  className="mt-0.5 h-4 w-4 accent-[#34088f]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 font-manrope truncate">{addon.name}</span>
                    <span className="text-xs font-bold text-[#34088f] ml-2">${addon.price}</span>
                  </div>
                  {addon.features?.[0] && <p className="text-[10px] text-gray-500 font-inter mt-0.5 truncate">{addon.features[0]}</p>}
                </div>
              </label>
            );
          })}
        </div>
      ) : order.selectedAddons?.length === 0 ? (
        <div className="text-center py-10 text-xs text-gray-400 font-inter bg-white rounded-2xl border border-gray-100">
          No add-ons selected.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {order.selectedAddons.map(id => {
            const meta = getAddonMeta(id);
            if (!meta) return null;
            return (
              <AddonCard
                key={id}
                orderId={order.id}
                addonId={id}
                name={meta.name}
                price={meta.price}
                features={meta.features}
                categoryNames={meta.categoryNames}
                snapshot={getSnapshot(id)}
                onSaved={onSaved}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
