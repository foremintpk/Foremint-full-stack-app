/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/AddonsSection.tsx
 * @description Administrative addon service toggling section with unsaved changes banner warnings.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { SectionEditWrapper } from './SectionEditWrapper';
import { updateOrderAddons } from '@/lib/admin/actions/updateOrderAddons';
import { ADDON_REGISTRY } from '@/lib/pricing';
import type { OrderDetail, Addon } from '@/types/admin';

interface AddonsSectionProps {
  order: OrderDetail;
  allAddons: Addon[];
}

export function AddonsSection({ order, allAddons }: AddonsSectionProps): React.JSX.Element {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sync state with dynamic order selected addons
  useEffect(() => {
    setSelectedIds(order.selectedAddons || []);
  }, [order]);

  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleSave = async () => {
    return updateOrderAddons(order.id, selectedIds);
  };

  const handleCancel = () => {
    setSelectedIds(order.selectedAddons || []);
  };

  const getAddonMeta = (id: string) => {
    const dbAddon = allAddons.find((a) => a.id === id);
    if (dbAddon) {
      const titleLower = dbAddon.name.toLowerCase();
      const isMonthly =
        titleLower.includes('phone') ||
        titleLower.includes('hosting') ||
        titleLower.includes('vps') ||
        titleLower.includes('address') ||
        titleLower.includes('trading');
      return {
        title: dbAddon.name,
        price: dbAddon.price,
        billingLabel: isMonthly ? '/ month' : 'One-time',
      };
    }
    const legacyMeta = (ADDON_REGISTRY as any)[id];
    if (legacyMeta) {
      return {
        title: legacyMeta.title,
        price: legacyMeta.price,
        billingLabel: legacyMeta.billingLabel,
      };
    }
    return null;
  };

  // Compare original addons and active selections to build unsaved change summary banner
  const originalSet = new Set(order.selectedAddons || []);
  const activeSet = new Set(selectedIds);

  const addedAddons = selectedIds
    .filter((id) => !originalSet.has(id))
    .map((id) => getAddonMeta(id)?.title || id);

  const removedAddons = (order.selectedAddons || [])
    .filter((id) => !activeSet.has(id))
    .map((id) => getAddonMeta(id)?.title || id);

  const hasUnsavedChanges = addedAddons.length > 0 || removedAddons.length > 0;

  return (
    <div className="border border-[#e0d9f7] rounded-xl overflow-hidden bg-white shadow-sm p-5">
      <SectionEditWrapper
        sectionTitle="Addon Services"
        onSave={handleSave}
        onCancel={handleCancel}
      >
        {(isEditing) => {
          if (!isEditing) {
            return (
              <div className="space-y-2">
                {order.selectedAddons.length === 0 ? (
                  <p className="text-sm font-semibold text-gray-400 font-inter py-2">
                    No addon services selected.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {order.selectedAddons.map((id) => {
                      const meta = getAddonMeta(id);
                      if (!meta) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between border border-[#ebebeb] px-4 py-3 rounded-[0.125rem] bg-gray-50/20 font-inter text-black"
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-gray-900 leading-tight">
                              {meta.title}
                            </p>
                            <p className="text-[10px] font-medium text-gray-500">
                              {meta.billingLabel}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-[#34088f]">
                            ${meta.price}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }


          return (
            <div className="space-y-6 animate-fade-in font-inter text-black">
              {/* Addon toggles grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allAddons.map((addon) => {
                  const isChecked = selectedIds.includes(addon.id);
                  const titleLower = addon.name.toLowerCase();
                  const isMonthly =
                    titleLower.includes('phone') ||
                    titleLower.includes('hosting') ||
                    titleLower.includes('vps') ||
                    titleLower.includes('address') ||
                    titleLower.includes('trading');
                  const billingLabel = isMonthly ? '/ month' : 'One-time';
                  return (
                    <label
                      key={addon.id}
                      className={`flex items-start gap-3 border p-4 rounded-[0.125rem] cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[#34088f] bg-[#34088f]/5'
                          : 'border-[#ebebeb] hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleCheckboxChange(addon.id, e.target.checked)}
                        className="mt-1 h-4 w-4 accent-[#34088f] cursor-pointer"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 leading-tight">
                            {addon.name}
                          </span>
                          <span className="text-xs font-bold text-[#34088f]">
                            ${addon.price} {billingLabel}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed truncate">
                          {addon.features && addon.features[0] ? addon.features[0] : 'Premium service addon'}
                        </p>
                      </div>
                    </label>
                  );
                })}
                {/* Keep legacy registry items if not present in DB */}
                {Object.values(ADDON_REGISTRY).map((addon) => {
                  if (allAddons.some((a) => a.id === addon.id)) return null;
                  const isChecked = selectedIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={`flex items-start gap-3 border p-4 rounded-[0.125rem] cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[#34088f] bg-[#34088f]/5'
                          : 'border-[#ebebeb] hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleCheckboxChange(addon.id, e.target.checked)}
                        className="mt-1 h-4 w-4 accent-[#34088f] cursor-pointer"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 leading-tight">
                            {addon.title}
                          </span>
                          <span className="text-xs font-bold text-[#34088f]">
                            ${addon.price} {addon.billingLabel}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium leading-relaxed truncate">
                          {addon.description[0]}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Unsaved changes banner list */}
              {hasUnsavedChanges && (
                <div className="flex flex-col gap-2 bg-amber-50 border border-amber-200 p-4 rounded-[0.125rem] text-xs font-semibold text-amber-800 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="font-bold">Unsaved Addon Changes:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 mt-1 text-[11px] font-medium text-amber-700">
                    {addedAddons.map((add) => (
                      <li key={add}>
                        Adding addon:{' '}
                        <strong className="text-amber-900 font-bold">{add}</strong>
                      </li>
                    ))}
                    {removedAddons.map((rem) => (
                      <li key={rem}>
                        Removing addon:{' '}
                        <strong className="text-amber-900 font-bold">{rem}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }}
      </SectionEditWrapper>
    </div>
  );
}
