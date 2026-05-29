/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/internal-operations/FormationDetailsSection.tsx
 * @description Editable inline sub-section for Company Formation Details.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Edit2, Save, X, Building } from 'lucide-react';
import { updateFormationDetails } from '@/lib/admin/actions/updateFormationDetails';
import type { FormationDetails, AddressBlock } from '@/types/admin';

interface FormationDetailsSectionProps {
 orderId: string;
 adminId: string;
 initialData: FormationDetails;
}

const emptyAddress = (): AddressBlock => ({
 street: '',
 city: '',
 state: '',
 zip: '',
 country: '',
});

export function FormationDetailsSection({
 orderId,
 adminId,
 initialData,
}: FormationDetailsSectionProps): React.JSX.Element {
 const [isEditing, setIsEditing] = useState(false);
 const [loading, setLoading] = useState(false);
 const [serverError, setServerError] = useState<string | null>(null);

 // Form states
 const [ein, setEin] = useState(initialData.einNumber || '');
 const [filingId, setFilingId] = useState(initialData.filingId || '');
 const [formationDate, setFormationDate] = useState(initialData.formationDate || '');
 const [stateRenewalDate, setStateRenewalDate] = useState(initialData.stateRenewalDate || '');
 const [stateRenewalFees, setStateRenewalFees] = useState(initialData.stateRenewalFees !== null ? String(initialData.stateRenewalFees) : '');

 // Address blocks
 const [mailingAddress, setMailingAddress] = useState<AddressBlock>(initialData.mailingAddress || emptyAddress());
 const [tradingAddress, setTradingAddress] = useState<AddressBlock>(initialData.tradingAddress || emptyAddress());
 const [businessAddress, setBusinessAddress] = useState<AddressBlock>(initialData.businessAddress || emptyAddress());

 // Validation errors
 const [errors, setErrors] = useState<Record<string, string>>({});

 const handleCancel = useCallback(() => {
 setEin(initialData.einNumber || '');
 setFilingId(initialData.filingId || '');
 setFormationDate(initialData.formationDate || '');
 setStateRenewalDate(initialData.stateRenewalDate || '');
 setStateRenewalFees(initialData.stateRenewalFees !== null ? String(initialData.stateRenewalFees) : '');
 setMailingAddress(initialData.mailingAddress || emptyAddress());
 setTradingAddress(initialData.tradingAddress || emptyAddress());
 setBusinessAddress(initialData.businessAddress || emptyAddress());
 setErrors({});
 setServerError(null);
 setIsEditing(false);
 }, [initialData]);

 const handleSave = async () => {
 setErrors({});
 setServerError(null);

 // Basic Validation
 const validationErrors: Record<string, string> = {};
 if (ein && !/^\d{2}-\d{7}$/.test(ein)) {
 validationErrors.ein = 'Format must be XX-XXXXXXX';
 }
 if (stateRenewalFees && isNaN(Number(stateRenewalFees))) {
 validationErrors.stateRenewalFees = 'Must be a valid numeric price';
 }

 if (Object.keys(validationErrors).length > 0) {
 setErrors(validationErrors);
 return;
 }

 setLoading(true);
 try {
 const result = await updateFormationDetails(orderId, adminId, {
 einNumber: ein || null,
 filingId: filingId || null,
 formationDate: formationDate || null,
 stateRenewalDate: stateRenewalDate || null,
 stateRenewalFees: stateRenewalFees ? Number(stateRenewalFees) : null,
 mailingAddress: mailingAddress,
 tradingAddress: tradingAddress,
 businessAddress: businessAddress,
 });

 if (result.success) {
 setIsEditing(false);
 } else {
 setServerError(result.error || 'Failed to update formation details.');
 }
 } catch (err: any) {
 setServerError(err.message || 'An unexpected error occurred.');
 } finally {
 setLoading(false);
 }
 };

 const handleAddressChange = (
 type: 'mailing' | 'trading' | 'business',
 field: keyof AddressBlock,
 value: string
 ) => {
 const setter =
 type === 'mailing'
 ? setMailingAddress
 : type === 'trading'
 ? setTradingAddress
 : setBusinessAddress;

 setter((prev) => ({ ...prev, [field]: value }));
 };

 const renderAddressDisplay = (title: string, address: AddressBlock) => {
 const hasVal = address.street || address.city || address.state || address.zip || address.country;
 return (
 <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 font-inter">
 <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
 {title}
 </h5>
 {hasVal ? (
 <div className="text-xs text-gray-800 space-y-0.5">
 <p className="font-semibold">{address.street || '—'}</p>
 <p>
 {address.city || '—'}, {address.state || '—'} {address.zip || '—'}
 </p>
 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
 {address.country || '—'}
 </p>
 </div>
 ) : (
 <p className="text-xs text-gray-400 italic">No address provided</p>
 )}
 </div>
 );
 };

 const renderAddressEdit = (type: 'mailing' | 'trading' | 'business', title: string, address: AddressBlock) => {
 return (
 <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3">
 <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-1.5">
 {title}
 </h5>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div className="md:col-span-2">
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Street</label>
 <input
 type="text"
 value={address.street}
 onChange={(e) => handleAddressChange(type, 'street', e.target.value)}
 className="mt-1 block w-full h-9 px-3 bg-white border border-[#e5e7eb] rounded-full text-xs font-inter outline-none focus:border-[#34088f] transition-all"
 />
 </div>
 <div>
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">City</label>
 <input
 type="text"
 value={address.city}
 onChange={(e) => handleAddressChange(type, 'city', e.target.value)}
 className="mt-1 block w-full h-9 px-3 bg-white border border-[#e5e7eb] rounded-full text-xs font-inter outline-none focus:border-[#34088f] transition-all"
 />
 </div>
 <div>
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">State</label>
 <input
 type="text"
 value={address.state}
 onChange={(e) => handleAddressChange(type, 'state', e.target.value)}
 className="mt-1 block w-full h-9 px-3 bg-white border border-[#e5e7eb] rounded-full text-xs font-inter outline-none focus:border-[#34088f] transition-all"
 />
 </div>
 <div>
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">ZIP Code</label>
 <input
 type="text"
 value={address.zip}
 onChange={(e) => handleAddressChange(type, 'zip', e.target.value)}
 className="mt-1 block w-full h-9 px-3 bg-white border border-[#e5e7eb] rounded-full text-xs font-inter outline-none focus:border-[#34088f] transition-all"
 />
 </div>
 <div>
 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Country</label>
 <input
 type="text"
 value={address.country}
 onChange={(e) => handleAddressChange(type, 'country', e.target.value)}
 className="mt-1 block w-full h-9 px-3 bg-white border border-[#e5e7eb] rounded-full text-xs font-inter outline-none focus:border-[#34088f] transition-all"
 />
 </div>
 </div>
 </div>
 );
 };

 return (
 <article
 aria-label="Formation specifications"
 className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
 >
 {/* Header Panel */}
 <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
 <div className="flex items-center gap-2">
 <Building className="w-5 h-5 text-[#34088f]" />
 <h4 className="text-sm font-bold font-manrope text-gray-900 uppercase tracking-wider">
 1. Formation Details
 </h4>
 </div>
 {!isEditing ? (
 <button
 onClick={() => setIsEditing(true)}
 className="flex items-center gap-1.5 px-4.5 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all font-manrope"
 >
 <Edit2 className="w-3.5 h-3.5 text-gray-500" />
 Edit
 </button>
 ) : (
 <div className="flex items-center gap-2">
 <button
 onClick={handleSave}
 disabled={loading}
 className="flex items-center gap-1.5 px-4.5 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope shadow-sm"
 >
 <Save className="w-3.5 h-3.5" />
 {loading ? 'Saving...' : 'Save'}
 </button>
 <button
 onClick={handleCancel}
 disabled={loading}
 className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all font-manrope"
 >
 <X className="w-3.5 h-3.5" />
 Cancel
 </button>
 </div>
 )}
 </div>

 {/* Top Section Error Banner */}
 {serverError && (
 <div className="bg-red-50 text-red-700 text-xs font-bold p-3.5 rounded-full border border-red-100 mb-6 font-inter">
 {serverError}
 </div>
 )}

 {/* Main Fields Grid */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div>
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-inter">
 EIN Number
 </label>
 {!isEditing ? (
 <p className="text-xs font-semibold text-gray-900 font-inter mt-1.5">
 {initialData.einNumber || <span className="text-gray-300 italic font-normal">Not Filed Yet</span>}
 </p>
 ) : (
 <div className="mt-1.5">
 <input
 type="text"
 placeholder="XX-XXXXXXX"
 value={ein}
 onChange={(e) => setEin(e.target.value)}
 className={`block w-full h-10 px-4 bg-white border rounded-full text-xs font-semibold font-inter outline-none transition-all ${
 errors.ein ? 'border-red-400 focus:border-red-400' : 'border-[#e5e7eb] focus:border-[#34088f]'
 }`}
 />
 {errors.ein && <p className="text-[10px] text-red-500 font-semibold mt-1 font-inter">{errors.ein}</p>}
 </div>
 )}
 </div>

 <div>
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-inter">
 Filing ID
 </label>
 {!isEditing ? (
 <p className="text-xs font-semibold text-gray-900 font-inter mt-1.5">
 {initialData.filingId || <span className="text-gray-300 italic font-normal">—</span>}
 </p>
 ) : (
 <input
 type="text"
 value={filingId}
 onChange={(e) => setFilingId(e.target.value)}
 className="mt-1.5 block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all"
 />
 )}
 </div>

 <div>
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-inter">
 Formation Date
 </label>
 {!isEditing ? (
 <p className="text-xs font-semibold text-gray-900 font-inter mt-1.5">
 {initialData.formationDate || <span className="text-gray-300 italic font-normal">—</span>}
 </p>
 ) : (
 <input
 type="date"
 value={formationDate}
 onChange={(e) => setFormationDate(e.target.value)}
 className="mt-1.5 block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all"
 />
 )}
 </div>

 <div>
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-inter">
 State Renewal Date
 </label>
 {!isEditing ? (
 <p className="text-xs font-semibold text-gray-900 font-inter mt-1.5">
 {initialData.stateRenewalDate || <span className="text-gray-300 italic font-normal">—</span>}
 </p>
 ) : (
 <input
 type="date"
 value={stateRenewalDate}
 onChange={(e) => setStateRenewalDate(e.target.value)}
 className="mt-1.5 block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all"
 />
 )}
 </div>

 <div>
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-inter">
 State Renewal Fees (PKR)
 </label>
 {!isEditing ? (
 <p className="text-xs font-semibold text-gray-900 font-inter mt-1.5 font-manrope">
 {initialData.stateRenewalFees !== null ? `Rs. ${initialData.stateRenewalFees.toLocaleString()}` : <span className="text-gray-300 italic font-normal font-inter">—</span>}
 </p>
 ) : (
 <div className="mt-1.5">
 <input
 type="text"
 value={stateRenewalFees}
 onChange={(e) => setStateRenewalFees(e.target.value)}
 className={`block w-full h-10 px-4 bg-white border rounded-full text-xs font-semibold font-inter outline-none transition-all ${
 errors.stateRenewalFees ? 'border-red-400 focus:border-red-400' : 'border-[#e5e7eb] focus:border-[#34088f]'
 }`}
 />
 {errors.stateRenewalFees && (
 <p className="text-[10px] text-red-500 font-semibold mt-1 font-inter">{errors.stateRenewalFees}</p>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Address Blocks Grid */}
 <div className="mt-8 border-t border-gray-100 pt-6">
 <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-manrope mb-4">
 Address Information
 </h4>
 {!isEditing ? (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {renderAddressDisplay('Business Address', businessAddress)}
 {renderAddressDisplay('Mailing Address', mailingAddress)}
 {renderAddressDisplay('Trading Address', tradingAddress)}
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {renderAddressEdit('business', 'Business Address', businessAddress)}
 {renderAddressEdit('mailing', 'Mailing Address', mailingAddress)}
 {renderAddressEdit('trading', 'Trading Address', tradingAddress)}
 </div>
 )}
 </div>
 </article>
 );
}
