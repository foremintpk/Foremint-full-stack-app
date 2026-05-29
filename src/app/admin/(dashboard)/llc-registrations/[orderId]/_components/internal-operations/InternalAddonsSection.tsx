/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/internal-operations/InternalAddonsSection.tsx
 * @description Admin sub-section to search, assign, price, and remove operational addons with optional document attachments.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Plus, Trash2, Link, FileText, Loader2, Search, X } from 'lucide-react';
import { addInternalAddon } from '@/lib/admin/actions/addInternalAddon';
import { removeInternalAddon } from '@/lib/admin/actions/removeInternalAddon';
import { ADDONS } from '@/lib/onboarding-data';
import type { InternalAddon } from '@/types/admin';

interface InternalAddonsSectionProps {
 orderId: string;
 adminId: string;
 initialAddons: InternalAddon[];
}

interface SelectableAddon {
 id: string;
 name: string;
 price: number;
 description: string;
}

export function InternalAddonsSection({
 orderId,
 adminId,
 initialAddons,
}: InternalAddonsSectionProps): React.JSX.Element {
 const [assignedAddons, setAssignedAddons] = useState<InternalAddon[]>(initialAddons);
 const [dbServices, setDbServices] = useState<SelectableAddon[]>([]);
 const [loading, setLoading] = useState(false);
 const [removingId, setRemovingId] = useState<string | null>(null);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);

 // Form states
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedAddon, setSelectedAddon] = useState<SelectableAddon | null>(null);
 const [customPrice, setCustomPrice] = useState('');
 const [description, setDescription] = useState('');
 const [attachment, setAttachment] = useState<File | null>(null);
 const [dropdownOpen, setDropdownOpen] = useState(false);

 // Fetch services from public.services on mount
 useEffect(() => {
 async function fetchServices() {
 try {
 const res = await fetch('/api/admin/services');
 if (res.ok) {
 const data = await res.json();
 if (Array.isArray(data.services)) {
 const mapped = data.services.map((s: any) => ({
 id: s.id,
 name: s.name,
 price: Number(s.price || 0),
 description: s.description || '',
 }));
 setDbServices(mapped);
 }
 }
 } catch (err) {
 console.error('Failed to fetch services list:', err);
 }
 }
 fetchServices();
 }, []);

 // Merge static ADDONS with database services
 const allAvailableAddons = useMemo((): SelectableAddon[] => {
 const staticAddons = ADDONS.map((a) => ({
 id: a.id,
 name: a.title,
 price: a.price,
 description: a.bullets?.join('. ') || '',
 }));

 // Combine and deduplicate by id/name
 const merged = [...staticAddons];
 dbServices.forEach((s) => {
 if (!merged.some((m) => m.id === s.id || m.name.toLowerCase() === s.name.toLowerCase())) {
 merged.push(s);
 }
 });

 return merged;
 }, [dbServices]);

 // Filter available addons by search query
 const filteredAddons = useMemo(() => {
 if (!searchQuery.trim()) return allAvailableAddons;
 return allAvailableAddons.filter((a) =>
 a.name.toLowerCase().includes(searchQuery.toLowerCase())
 );
 }, [allAvailableAddons, searchQuery]);

 const handleSelectAddon = (addon: SelectableAddon) => {
 setSelectedAddon(addon);
 setCustomPrice(String(addon.price));
 setSearchQuery(addon.name);
 setDropdownOpen(false);
 };

 const handleAssign = async () => {
 if (!selectedAddon) return;
 setLoading(true);
 setErrorMsg(null);

 try {
 let documentId: string | undefined;

 // 1. If attachment is selected, upload it first to obtain a documentId
 if (attachment) {
 const formData = new FormData();
 formData.append('file', attachment);
 formData.append('slotKey', 'additional');
 formData.append('title', `Attachment: ${selectedAddon.name}`);
 formData.append('adminId', adminId);

 const uploadRes = await fetch(`/api/admin/orders/${orderId}/documents`, {
 method: 'POST',
 body: formData,
 });

 const uploadData = await uploadRes.json();
 if (!uploadRes.ok || uploadData.error) {
 setErrorMsg(uploadData.error || 'Failed to upload addon attachment.');
 setLoading(false);
 return;
 }

 documentId = uploadData.document.id;
 }

 // 2. Call the server action to save addon assignment
 const price = customPrice ? Number(customPrice) : selectedAddon.price;
 const res = await addInternalAddon({
 orderId,
 addonId: selectedAddon.id,
 addonName: selectedAddon.name,
 addonPrice: isNaN(price) ? selectedAddon.price : price,
 description: description.trim() || undefined,
 documentId,
 adminId,
 });

 if (res.success) {
 // Force refresh local data by reloading or re-fetching
 window.location.reload();
 } else {
 setErrorMsg(res.error || 'Failed to assign addon.');
 }
 } catch (err: any) {
 setErrorMsg(err.message || 'An unexpected error occurred.');
 } finally {
 setLoading(false);
 }
 };

 const handleRemove = async (assignmentId: string) => {
 if (!confirm('Are you sure you want to remove this addon?')) return;
 setRemovingId(assignmentId);
 setErrorMsg(null);

 try {
 const res = await removeInternalAddon(assignmentId, orderId, adminId);
 if (res.success) {
 setAssignedAddons((prev) => prev.filter((a) => a.id !== assignmentId));
 // Force reload page to sync billing values perfectly
 window.location.reload();
 } else {
 setErrorMsg(res.error || 'Failed to remove addon.');
 }
 } catch (err: any) {
 setErrorMsg(err.message || 'An error occurred.');
 } finally {
 setRemovingId(null);
 }
 };

 return (
 <article
 aria-label="Addon modules"
 className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
 >
 {/* Header */}
 <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
 <Settings className="w-5 h-5 text-[#34088f]" />
 <h4 className="text-sm font-bold font-manrope text-gray-900 uppercase tracking-wider">
 3. Internal Add-ons & Custom Services
 </h4>
 </div>

 {/* Error Message */}
 {errorMsg && (
 <div className="bg-red-50 text-red-700 text-xs font-bold p-3.5 rounded-full border border-red-100 mb-6 font-inter">
 {errorMsg}
 </div>
 )}

 {/* Grid: Form on left/top, Table on right/bottom */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Form Panel */}
 <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4">
 <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
 Assign Custom Service
 </h5>

 {/* Search/Select autocomplete */}
 <div className="relative">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-inter">
 Search & Select Addon
 </label>
 <div className="relative mt-1">
 <input
 type="text"
 value={searchQuery}
 onFocus={() => setDropdownOpen(true)}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 setSelectedAddon(null);
 setDropdownOpen(true);
 }}
 placeholder="Type to search available services..."
 className="block w-full h-9 pl-9 pr-8 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all"
 />
 <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
 {searchQuery && (
 <button
 onClick={() => {
 setSearchQuery('');
 setSelectedAddon(null);
 }}
 className="absolute right-3 top-2.5 p-0.5 hover:bg-gray-100 rounded-full"
 >
 <X className="w-3 h-3 text-gray-400" />
 </button>
 )}
 </div>

 {/* Dropdown Options */}
 {dropdownOpen && filteredAddons.length > 0 && (
 <div className="absolute z-10 w-full mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-lg max-h-48 overflow-y-auto py-1.5">
 {filteredAddons.map((addon) => (
 <button
 key={addon.id}
 onClick={() => handleSelectAddon(addon)}
 className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs font-semibold font-inter flex items-center justify-between"
 >
 <span className="text-gray-800 truncate">{addon.name}</span>
 <span className="text-[#34088f] font-manrope shrink-0">
 ${addon.price.toLocaleString()}
 </span>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Custom Price Override */}
 <div>
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-inter">
 Price (USD)
 </label>
 <input
 type="text"
 placeholder={selectedAddon ? String(selectedAddon.price) : '0.00'}
 value={customPrice}
 onChange={(e) => setCustomPrice(e.target.value)}
 className="mt-1 block w-full h-9 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all"
 />
 </div>

 {/* Description */}
 <div>
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-inter">
 Notes / Description
 </label>
 <textarea
 placeholder="Internal operational notes regarding this addon..."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="mt-1 block w-full h-20 px-4 py-2 bg-white border border-[#e5e7eb] rounded-xl text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all resize-none"
 />
 </div>

 {/* Optional Attachment */}
 <div>
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-inter block mb-1">
 Optional Document Attachment
 </label>
 <input
 type="file"
 onChange={(e) => setAttachment(e.target.files?.[0] || null)}
 className="block w-full text-xs text-gray-500 font-inter file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
 />
 </div>

 <button
 onClick={handleAssign}
 disabled={!selectedAddon || loading}
 className="w-full flex items-center justify-center gap-1.5 h-10 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-40 transition-all font-manrope shadow-sm"
 >
 {loading ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 ) : (
 <Plus className="w-3.5 h-3.5" />
 )}
 {loading ? 'Adding...' : 'Assign Add-on'}
 </button>
 </div>

 {/* List of Assigned Addons Table */}
 <div className="lg:col-span-2 space-y-3">
 <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-manrope">
 Assigned Operational Add-ons
 </h5>

 <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm font-inter">
 {assignedAddons.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-gray-50 border-b border-gray-100">
 <tr>
 <th className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider">Service Name</th>
 <th className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider">Price (USD)</th>
 <th className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider">Details / Files</th>
 <th className="px-5 py-3 font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {assignedAddons.map((addon) => (
 <tr key={addon.id} className="hover:bg-gray-50/50 transition-colors">
 <td className="px-5 py-3.5 font-bold text-gray-900">{addon.addonName}</td>
 <td className="px-5 py-3.5 font-bold text-[#34088f] font-manrope">
 ${addon.addonPrice.toLocaleString()}
 </td>
 <td className="px-5 py-3.5 text-gray-500 max-w-[200px]">
 {addon.description && <p className="truncate mb-1">{addon.description}</p>}
 {addon.documentUrl && (
 <a
 href={addon.documentUrl}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1 text-[10px] font-bold text-[#34088f] hover:underline"
 >
 <Link className="w-3 h-3" />
 View Attachment
 </a>
 )}
 </td>
 <td className="px-5 py-3.5 text-right shrink-0">
 <button
 onClick={() => handleRemove(addon.id)}
 disabled={removingId === addon.id}
 className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-all disabled:opacity-40"
 title="Remove Addon"
 >
 {removingId === addon.id ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Trash2 className="w-4 h-4" />
 )}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 ) : (
 <div className="p-8 text-center">
 <Settings className="w-8 h-8 text-gray-300 mx-auto mb-2" />
 <p className="text-xs text-gray-400 italic">No operational add-ons assigned to this order.</p>
 </div>
 )}
 </div>
 </div>
 </div>
 </article>
 );
}
