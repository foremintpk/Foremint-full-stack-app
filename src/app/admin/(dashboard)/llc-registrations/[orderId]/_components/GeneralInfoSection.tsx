/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/GeneralInfoSection.tsx
 * @description General client profile display and safe, debounced customer reassignment combobox.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Search, UserCheck, RefreshCw, X } from 'lucide-react';
import { SectionEditWrapper } from './SectionEditWrapper';
import { ReadOnlyField } from './ReadOnlyField';
import { updateGeneralInfo } from '@/lib/admin/actions/updateGeneralInfo';
import type { OrderDetail } from '@/types/admin';
import { cn } from '@/lib/utils';

interface GeneralInfoSectionProps {
 order: OrderDetail;
}

interface SearchedUser {
 id: string;
 fullName: string | null;
 email: string;
 avatarUrl: string | null;
}

export function GeneralInfoSection({ order }: GeneralInfoSectionProps): React.JSX.Element {
 // Input fields local states
 const [name, setName] = useState(order.clientName || '');
 const [email, setEmail] = useState(order.clientEmail || '');
 const [phone, setPhone] = useState(order.clientPhone || '');

 // Reassignment local states
 const [searchQuery, setSearchQuery] = useState('');
 const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
 const [isSearching, setIsSearching] = useState(false);
 const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);

 // Sync states on load or order refresh
 useEffect(() => {
 setName(order.clientName || '');
 setEmail(order.clientEmail || '');
 setPhone(order.clientPhone || '');
 setSelectedUser(null);
 setSearchQuery('');
 setSearchResults([]);
 }, [order]);

 // Debounced search trigger for reassignment
 useEffect(() => {
 if (!searchQuery.trim()) {
 setSearchResults([]);
 return;
 }

 const handler = setTimeout(async () => {
 setIsSearching(true);
 try {
 const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`);
 if (res.ok) {
 const data = await res.json();
 setSearchResults(data);
 }
 } catch (err) {
 console.error('[User search query error]:', err);
 } finally {
 setIsSearching(false);
 }
 }, 300);

 return () => clearTimeout(handler);
 }, [searchQuery]);

 const handleSave = async () => {
 const payload = {
 name: name || '',
 email: email || '',
 phone: phone.trim() ? phone : null,
 userId: selectedUser ? selectedUser.id : undefined,
 };
 return updateGeneralInfo(order.id, payload);
 };

 const handleCancel = () => {
 setName(order.clientName || '');
 setEmail(order.clientEmail || '');
 setPhone(order.clientPhone || '');
 setSelectedUser(null);
 setSearchQuery('');
 setSearchResults([]);
 };

 return (
 <div className="border border-[#e0d9f7] rounded-xl overflow-hidden bg-white shadow-sm p-5">
 <SectionEditWrapper
 sectionTitle="General Information"
 onSave={handleSave}
 onCancel={handleCancel}
 >
 {(isEditing) => {
 if (!isEditing) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <ReadOnlyField label="Client Name" value={order.clientName || ''} />
 <ReadOnlyField label="Email Address" value={order.clientEmail || ''} />
 <ReadOnlyField label="Phone Number" value={order.clientPhone || '—'} />
 </div>
 );
 }

 return (
 <div className="space-y-6 animate-fade-in font-inter">
 {/* Form Input fields */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="flex flex-col gap-1">
 <label htmlFor="client-name" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Client Name
 </label>
 <input
 id="client-name"
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="border border-[#ebebeb] px-3 py-1.5 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] transition-all bg-white text-black"
 />
 </div>


 <div className="flex flex-col gap-1">
 <label htmlFor="client-email" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Email Address
 </label>
 <input
 id="client-email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="border border-[#ebebeb] px-3 py-1.5 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] transition-all bg-white text-black"
 />
 </div>

 <div className="flex flex-col gap-1">
 <label htmlFor="client-phone" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Phone Number
 </label>
 <input
 id="client-phone"
 type="text"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="Enter phone number"
 className="border border-[#ebebeb] px-3 py-1.5 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] transition-all bg-white text-black"
 />
 </div>
 </div>

 {/* Debounced Combobox search for order reassignment */}
 <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Reassign Order Owner
 </label>
 
 {selectedUser ? (
 /* Owner Reassigned pending confirmation warning */
 <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-[0.125rem] text-xs font-semibold text-amber-800">
 <div className="flex items-center gap-2">
 <UserCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
 <span>
 Confirm transferring ownership to:{' '}
 <strong>{selectedUser.fullName || 'Unnamed User'}</strong> ({selectedUser.email})?
 </span>
 </div>
 <button
 onClick={() => setSelectedUser(null)}
 aria-label="Cancel reassignment"
 className="text-gray-400 hover:text-amber-800 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 ) : (
 /* Search box */
 <div className="relative max-w-md">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
 {isSearching ? (
 <RefreshCw className="w-4 h-4 animate-spin" />
 ) : (
 <Search className="w-4 h-4" />
 )}
 </span>
 <input
 type="text"
 placeholder="Search customers by name or email..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-[0.125rem] border border-[#ebebeb] focus:outline-none focus:border-[#34088f] bg-white text-black"
 />

 {/* Autocomplete popup dropdown */}
 {searchResults.length > 0 && (
 <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#ebebeb] rounded-sm shadow-md overflow-hidden z-20 divide-y divide-gray-50">
 {searchResults.map((user) => (
 <button
 key={user.id}
 type="button"
 onClick={() => {
 setSelectedUser(user);
 setSearchResults([]);
 setSearchQuery('');
 }}
 className="w-full text-left px-4 py-2 hover:bg-[#34088f]/5 text-xs font-semibold font-inter transition-all flex items-center justify-between"
 >
 <span>
 {user.fullName || 'Unnamed'} ({user.email})
 </span>
 <span className="text-[10px] text-gray-400 font-bold uppercase">
 Select
 </span>
 </button>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
 }}
 </SectionEditWrapper>
 </div>
 );
}
