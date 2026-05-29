/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/internal-operations/BillingSection.tsx
 * @description Editable sub-section for Order Billing, computed aggregates, PKR overrides, and payment tracking.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { DollarSign, Edit2, Save, X, Calculator } from 'lucide-react';
import { updateOrderBilling } from '@/lib/admin/actions/updateOrderBilling';
import type { OrderBilling } from '@/types/admin';

interface BillingSectionProps {
 orderId: string;
 adminId: string;
 initialBilling: OrderBilling;
}

export function BillingSection({
 orderId,
 adminId,
 initialBilling,
}: BillingSectionProps): React.JSX.Element {
 const [isEditing, setIsEditing] = useState(false);
 const [loading, setLoading] = useState(false);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);

 // Form states
 const [grandTotalPkr, setGrandTotalPkr] = useState(
 initialBilling.grandTotalPkr !== null ? String(initialBilling.grandTotalPkr) : ''
 );
 const [advanceAmount, setAdvanceAmount] = useState(
 initialBilling.advanceAmount !== null ? String(initialBilling.advanceAmount) : ''
 );
 const [advancePaymentDate, setAdvancePaymentDate] = useState(
 initialBilling.advancePaymentDate || ''
 );
 const [discountPkr, setDiscountPkr] = useState(
 initialBilling.discountPkr !== null ? String(initialBilling.discountPkr) : ''
 );
 const [secondPaymentAmount, setSecondPaymentAmount] = useState(
 initialBilling.secondPaymentAmount !== null ? String(initialBilling.secondPaymentAmount) : ''
 );

 const [errors, setErrors] = useState<Record<string, string>>({});

 const handleCancel = useCallback(() => {
 setGrandTotalPkr(initialBilling.grandTotalPkr !== null ? String(initialBilling.grandTotalPkr) : '');
 setAdvanceAmount(initialBilling.advanceAmount !== null ? String(initialBilling.advanceAmount) : '');
 setAdvancePaymentDate(initialBilling.advancePaymentDate || '');
 setDiscountPkr(initialBilling.discountPkr !== null ? String(initialBilling.discountPkr) : '');
 setSecondPaymentAmount(initialBilling.secondPaymentAmount !== null ? String(initialBilling.secondPaymentAmount) : '');
 setErrors({});
 setErrorMsg(null);
 setIsEditing(false);
 }, [initialBilling]);

 // Live Second Payment PKR calculation hint
 const calculatedSecondPayment = useMemo(() => {
 const total = grandTotalPkr ? Number(grandTotalPkr) : 0;
 const discount = discountPkr ? Number(discountPkr) : 0;
 const advance = advanceAmount ? Number(advanceAmount) : 0;
 if (isNaN(total) || isNaN(discount) || isNaN(advance)) return null;
 const val = total - discount - advance;
 return val >= 0 ? val : 0;
 }, [grandTotalPkr, discountPkr, advanceAmount]);

 const handleSave = async () => {
 setErrors({});
 setErrorMsg(null);

 // Validation
 const validationErrors: Record<string, string> = {};
 if (grandTotalPkr && isNaN(Number(grandTotalPkr))) {
 validationErrors.grandTotalPkr = 'Must be a valid number';
 }
 if (advanceAmount && isNaN(Number(advanceAmount))) {
 validationErrors.advanceAmount = 'Must be a valid number';
 }
 if (discountPkr && isNaN(Number(discountPkr))) {
 validationErrors.discountPkr = 'Must be a valid number';
 }
 if (secondPaymentAmount && isNaN(Number(secondPaymentAmount))) {
 validationErrors.secondPaymentAmount = 'Must be a valid number';
 }

 if (Object.keys(validationErrors).length > 0) {
 setErrors(validationErrors);
 return;
 }

 setLoading(true);
 try {
 const res = await updateOrderBilling(orderId, adminId, {
 grandTotalPkr: grandTotalPkr ? Number(grandTotalPkr) : null,
 advanceAmount: advanceAmount ? Number(advanceAmount) : null,
 advancePaymentDate: advancePaymentDate || null,
 discountPkr: discountPkr ? Number(discountPkr) : null,
 secondPaymentAmount: secondPaymentAmount ? Number(secondPaymentAmount) : null,
 });

 if (res.success) {
 setIsEditing(false);
 // Force reload page to sync billing values perfectly
 window.location.reload();
 } else {
 setErrorMsg(res.error || 'Failed to update billing details.');
 }
 } catch (err: any) {
 setErrorMsg(err.message || 'An unexpected error occurred.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <article
 aria-label="Billing summaries"
 className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
 >
 {/* Header */}
 <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
 <div className="flex items-center gap-2">
 <DollarSign className="w-5 h-5 text-[#34088f]" />
 <h4 className="text-sm font-bold font-manrope text-gray-900 uppercase tracking-wider">
 4. Order Billing & PKR Financials
 </h4>
 </div>

 {!isEditing ? (
 <button
 onClick={() => setIsEditing(true)}
 className="flex items-center gap-1.5 px-4.5 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all font-manrope"
 >
 <Edit2 className="w-3.5 h-3.5 text-gray-500" />
 Edit Overrides
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
 {errorMsg && (
 <div className="bg-red-50 text-red-700 text-xs font-bold p-3.5 rounded-full border border-red-100 mb-6 font-inter">
 {errorMsg}
 </div>
 )}

 {/* Main Billing Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* USD Computed Aggregates Column */}
 <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4 font-inter">
 <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1">
 <DollarSign className="w-4 h-4 text-gray-500" />
 USD Aggregates (Computed)
 </h5>

 <div className="space-y-2.5 text-xs">
 <div className="flex items-center justify-between text-gray-600">
 <span>Package Price:</span>
 <span className="font-semibold text-gray-800">${initialBilling.packagePrice.toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between text-gray-600">
 <span>State Renewal Fee:</span>
 <span className="font-semibold text-gray-800">${initialBilling.stateFee.toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between text-gray-600">
 <span>Customer Addons:</span>
 <span className="font-semibold text-gray-800">${initialBilling.customerAddonsTotal.toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between text-gray-600">
 <span>Internal Addons:</span>
 <span className="font-semibold text-gray-800">${initialBilling.internalAddonsTotal.toLocaleString()}</span>
 </div>
 <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between font-bold text-[#34088f] text-sm font-manrope">
 <span>Grand Total USD:</span>
 <span>${initialBilling.grandTotalUsd.toLocaleString()}</span>
 </div>
 </div>
 </div>

 {/* PKR Pricing Overrides Form Fields */}
 <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 font-inter">
 {/* PKR Overridden Grand Total */}
 <div>
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 PKR Grand Total Override
 </label>
 {!isEditing ? (
 <p className="text-xs font-semibold text-gray-900 mt-1.5 font-manrope">
 {initialBilling.grandTotalPkr !== null ? `Rs. ${initialBilling.grandTotalPkr.toLocaleString()}` : <span className="text-gray-300 italic font-normal font-inter">Not Set</span>}
 </p>
 ) : (
 <div className="mt-1.5">
 <input
 type="text"
 placeholder="e.g. 85000"
 value={grandTotalPkr}
 onChange={(e) => setGrandTotalPkr(e.target.value)}
 className={`block w-full h-10 px-4 bg-white border rounded-full text-xs font-semibold outline-none transition-all ${
 errors.grandTotalPkr ? 'border-red-400 focus:border-red-400' : 'border-[#e5e7eb] focus:border-[#34088f]'
 }`}
 />
 {errors.grandTotalPkr && (
 <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.grandTotalPkr}</p>
 )}
 </div>
 )}
 </div>

 {/* Discount PKR */}
 <div>
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 PKR Discount
 </label>
 {!isEditing ? (
 <p className="text-xs font-semibold text-gray-900 mt-1.5 font-manrope">
 {initialBilling.discountPkr !== null ? `Rs. ${initialBilling.discountPkr.toLocaleString()}` : <span className="text-gray-300 italic font-normal font-inter">No Discount</span>}
 </p>
 ) : (
 <div className="mt-1.5">
 <input
 type="text"
 placeholder="e.g. 5000"
 value={discountPkr}
 onChange={(e) => setDiscountPkr(e.target.value)}
 className={`block w-full h-10 px-4 bg-white border rounded-full text-xs font-semibold outline-none transition-all ${
 errors.discountPkr ? 'border-red-400 focus:border-red-400' : 'border-[#e5e7eb] focus:border-[#34088f]'
 }`}
 />
 {errors.discountPkr && (
 <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.discountPkr}</p>
 )}
 </div>
 )}
 </div>

 {/* Advance Amount Paid */}
 <div>
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 PKR Advance Amount
 </label>
 {!isEditing ? (
 <p className="text-xs font-semibold text-gray-900 mt-1.5 font-manrope">
 {initialBilling.advanceAmount !== null ? `Rs. ${initialBilling.advanceAmount.toLocaleString()}` : <span className="text-gray-300 italic font-normal font-inter">Not Paid</span>}
 </p>
 ) : (
 <div className="mt-1.5">
 <input
 type="text"
 placeholder="e.g. 40000"
 value={advanceAmount}
 onChange={(e) => setAdvanceAmount(e.target.value)}
 className={`block w-full h-10 px-4 bg-white border rounded-full text-xs font-semibold outline-none transition-all ${
 errors.advanceAmount ? 'border-red-400 focus:border-red-400' : 'border-[#e5e7eb] focus:border-[#34088f]'
 }`}
 />
 {errors.advanceAmount && (
 <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.advanceAmount}</p>
 )}
 </div>
 )}
 </div>

 {/* Advance Payment Date */}
 <div>
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Advance Payment Date
 </label>
 {!isEditing ? (
 <p className="text-xs font-semibold text-gray-900 mt-1.5">
 {initialBilling.advancePaymentDate || <span className="text-gray-300 italic font-normal">—</span>}
 </p>
 ) : (
 <input
 type="date"
 value={advancePaymentDate}
 onChange={(e) => setAdvancePaymentDate(e.target.value)}
 className="mt-1.5 block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold outline-none focus:border-[#34088f] transition-all"
 />
 )}
 </div>

 {/* Second Payment Amount with Dynamic Hint */}
 <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
 <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Second Payment Amount (PKR)
 </label>
 {!isEditing ? (
 <div className="mt-1.5 flex flex-col gap-1">
 <p className="text-sm font-bold text-gray-900 font-manrope">
 {initialBilling.secondPaymentAmount !== null ? `Rs. ${initialBilling.secondPaymentAmount.toLocaleString()}` : <span className="text-gray-300 italic font-normal font-inter">Not Set</span>}
 </p>
 {initialBilling.secondPaymentAmount === null && (
 <span className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold">
 <Calculator className="w-3.5 h-3.5 text-gray-400 shrink-0" />
 Calculated Second Payment: Rs. {calculatedSecondPayment?.toLocaleString() || 0}
 </span>
 )}
 </div>
 ) : (
 <div className="mt-1.5">
 <input
 type="text"
 placeholder={calculatedSecondPayment !== null ? String(calculatedSecondPayment) : '0'}
 value={secondPaymentAmount}
 onChange={(e) => setSecondPaymentAmount(e.target.value)}
 className={`block w-full h-10 px-4 bg-white border rounded-full text-xs font-semibold outline-none transition-all ${
 errors.secondPaymentAmount ? 'border-red-400 focus:border-red-400' : 'border-[#e5e7eb] focus:border-[#34088f]'
 }`}
 />
 {errors.secondPaymentAmount && (
 <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.secondPaymentAmount}</p>
 )}

 {/* Real-time Dynamic Second Payment grey hint */}
 <div className="mt-2 text-[10px] text-gray-500 font-semibold flex items-center gap-1 bg-gray-50 px-3.5 py-1.5 rounded-full border border-gray-100/60 w-fit">
 <Calculator className="w-3.5 h-3.5 text-gray-400 shrink-0 animate-pulse" />
 Live calculation hint: (Total PKR - Discount - Advance) = Rs.{' '}
 {calculatedSecondPayment?.toLocaleString() || 0}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </article>
 );
}
