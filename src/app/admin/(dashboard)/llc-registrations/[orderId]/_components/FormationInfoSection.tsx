/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/FormationInfoSection.tsx
 * @description Operational section for editing company formation details (state, type, packaging).
 */

'use client';

import React, { useState, useEffect } from 'react';
import { SectionEditWrapper } from './SectionEditWrapper';
import { ReadOnlyField } from './ReadOnlyField';
import { updateFormationInfo } from '@/lib/admin/actions/updateFormationInfo';
import { US_STATES } from '@/lib/onboarding-data';
import type { OrderDetail, Package } from '@/types/admin';

interface FormationInfoSectionProps {
 order: OrderDetail;
 allPackages: Package[];
}

export function FormationInfoSection({ order, allPackages }: FormationInfoSectionProps): React.JSX.Element {
 // Input fields local states
 const [businessName, setBusinessName] = useState('');
 const [secondaryBusinessName, setSecondaryBusinessName] = useState('');
 const [businessWebsite, setBusinessWebsite] = useState('');
 const [businessCategory, setBusinessCategory] = useState('');
 const [businessDescription, setBusinessDescription] = useState('');
 const [entityType, setEntityType] = useState('');
 const [memberType, setMemberType] = useState('');
 const [formationState, setFormationState] = useState('');
 const [formationPackage, setFormationPackage] = useState('');

 // Sync inputs with loaded order details
 useEffect(() => {
 // Extract raw businessName from formSnapshot (without "LLC" suffix unless in original submission)
 const rawName =
 (order.formSnapshot as any)?.step3?.businessName ??
 (order.formSnapshot as any)?.businessName ??
 '';
 const snapshot = (order.formSnapshot as any) || {};
 setBusinessName(rawName);
 setSecondaryBusinessName(snapshot?.step3?.secondaryBusinessName ?? snapshot.secondaryBusinessName ?? '');
 setBusinessWebsite(snapshot?.step3?.businessWebsite ?? snapshot.businessWebsite ?? '');
 setBusinessCategory(snapshot?.step3?.businessCategory ?? snapshot.businessCategory ?? '');
 setBusinessDescription(snapshot?.step3?.businessDescription ?? snapshot.businessDescription ?? '');
 setEntityType(order.entityType || 'us-llc');
 setMemberType(order.memberType || 'single-member');
 setFormationState(order.formationState || 'WY');
 setFormationPackage(order.formationPackage || 'standard');
 }, [order]);

 const handleSave = async () => {
 return updateFormationInfo(order.id, {
 businessName,
 secondaryBusinessName,
 businessWebsite,
 businessCategory,
 businessDescription,
 entityType,
 memberType,
 formationState,
 formationPackage,
 });
 };

 const handleCancel = () => {
 const rawName =
 (order.formSnapshot as any)?.step3?.businessName ??
 (order.formSnapshot as any)?.businessName ??
 '';
 const snapshot = (order.formSnapshot as any) || {};
 setBusinessName(rawName);
 setSecondaryBusinessName(snapshot?.step3?.secondaryBusinessName ?? snapshot.secondaryBusinessName ?? '');
 setBusinessWebsite(snapshot?.step3?.businessWebsite ?? snapshot.businessWebsite ?? '');
 setBusinessCategory(snapshot?.step3?.businessCategory ?? snapshot.businessCategory ?? '');
 setBusinessDescription(snapshot?.step3?.businessDescription ?? snapshot.businessDescription ?? '');
 setEntityType(order.entityType || 'us-llc');
 setMemberType(order.memberType || 'single-member');
 setFormationState(order.formationState || 'WY');
 setFormationPackage(order.formationPackage || 'standard');
 };


 // Helper formatting labels
 const getEntityTypeLabel = (type: string) => {
 if (type === 'us_llc' || type === 'us-llc') return 'US LLC';
 if (type === 'uk_ltd' || type === 'uk-ltd') return 'UK LTD';
 return type;
 };

 const getMemberTypeLabel = (m: string) => {
 if (m === 'single' || m === 'single-member') return 'Single-member';
 if (m === 'multi' || m === 'multi-member') return 'Multi-member';
 return m;
 };

 const getPackageLabel = (p: string) => {
 const pkg = allPackages.find(x => x.id === p);
 if (pkg) return `${pkg.name} ($${pkg.price})`;
 if (p === 'standard') return 'Standard Package ($120)';
 if (p === 'advanced') return 'Advanced Package ($170)';
 return p;
 };

 const readSnapshot = (order.formSnapshot as any) || {};
 const readStep3 = readSnapshot.step3 || {};

 return (
 <div className="border border-[#e0d9f7] rounded-xl overflow-hidden bg-white shadow-sm p-5">
 <SectionEditWrapper
 sectionTitle="Formation Details"
 onSave={handleSave}
 onCancel={handleCancel}
 >
 {(isEditing) => {
 if (!isEditing) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <ReadOnlyField label="LLC Name" value={order.llcName} />
 <ReadOnlyField label="Secondary Name" value={readSnapshot.secondaryBusinessName || readStep3.secondaryBusinessName || '-'} />
 <ReadOnlyField label="Business Website" value={readSnapshot.businessWebsite || readStep3.businessWebsite || '-'} />
 <ReadOnlyField label="Business Category" value={readSnapshot.businessCategory || readStep3.businessCategory || '-'} />
 <ReadOnlyField label="Business Description" value={readSnapshot.businessDescription || readStep3.businessDescription || '-'} />
 <ReadOnlyField label="Company Type" value={getEntityTypeLabel(order.entityType || '')} />
 <ReadOnlyField label="Member Type" value={getMemberTypeLabel(order.memberType || '')} />
 <ReadOnlyField
 label="Filing State"
 value={
 order.formationStateName
 ? `${order.formationStateName} (${order.formationState})`
 : order.formationState || '—'
 }
 />
 <ReadOnlyField label="Package Selected" value={getPackageLabel(order.formationPackage || '')} />
 </div>
 );
 }

 return (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in font-inter text-black">
 {/* LLC Name */}
 <div className="flex flex-col gap-1">
 <label htmlFor="business-name" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 LLC Business Name
 </label>
 <input
 id="business-name"
 type="text"
 value={businessName}
 onChange={(e) => setBusinessName(e.target.value)}
 className="border border-[#ebebeb] px-3 py-1.5 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
   />
 </div>

 <div className="flex flex-col gap-1">
 <label htmlFor="secondary-business-name" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Secondary Business Name
 </label>
 <input
 id="secondary-business-name"
 type="text"
 value={secondaryBusinessName}
 onChange={(e) => setSecondaryBusinessName(e.target.value)}
 className="border border-[#ebebeb] px-3 py-1.5 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
 />
 </div>

 <div className="flex flex-col gap-1">
 <label htmlFor="business-website" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Business Website
 </label>
 <input
 id="business-website"
 type="url"
 value={businessWebsite}
 onChange={(e) => setBusinessWebsite(e.target.value)}
 className="border border-[#ebebeb] px-3 py-1.5 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
 />
 </div>

 <div className="flex flex-col gap-1">
 <label htmlFor="business-category" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Business Category
 </label>
 <input
 id="business-category"
 type="text"
 value={businessCategory}
 onChange={(e) => setBusinessCategory(e.target.value)}
 className="border border-[#ebebeb] px-3 py-1.5 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
 />
 </div>

 {/* Company Type */}
 <div className="flex flex-col gap-1">
 <label htmlFor="entity-type" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Company Type
 </label>
 <select
 id="entity-type"
 value={entityType}
 onChange={(e) => setEntityType(e.target.value)}
 className="border border-[#ebebeb] px-3 py-2 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
 >
 <option value="us-llc">US LLC</option>
 <option value="uk-ltd">UK LTD</option>
 </select>
 </div>

 {/* Member Type */}
 <div className="flex flex-col gap-1">
 <label htmlFor="member-type" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Member Type
 </label>
 <select
 id="member-type"
 value={memberType}
 onChange={(e) => setMemberType(e.target.value)}
 className="border border-[#ebebeb] px-3 py-2 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
 >
 <option value="single-member">Single-member</option>
 <option value="multi-member">Multi-member</option>
 </select>
 </div>

 {/* Filing State */}
 <div className="flex flex-col gap-1">
 <label htmlFor="formation-state" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Filing State
 </label>
 <select
 id="formation-state"
 value={formationState}
 onChange={(e) => setFormationState(e.target.value)}
 className="border border-[#ebebeb] px-3 py-2 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
 >
 {US_STATES.map((state) => (
   <option key={state.abbreviation} value={state.abbreviation}>
     {state.name} (${state.filingFee})
   </option>
 ))}
 </select>
 </div>

 {/* Package selected */}
 <div className="flex flex-col gap-1">
 <label htmlFor="formation-package" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Package Selected
 </label>
 <select
 id="formation-package"
 value={formationPackage}
 onChange={(e) => setFormationPackage(e.target.value)}
 className="border border-[#ebebeb] px-3 py-2 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
 >
 {allPackages.map((pkg) => (
   <option key={pkg.id} value={pkg.id}>
     {pkg.name} (${pkg.price})
   </option>
 ))}
 {!allPackages.some(pkg => pkg.id === 'standard') && (
   <option value="standard">Standard Package ($120)</option>
 )}
 {!allPackages.some(pkg => pkg.id === 'advanced') && (
   <option value="advanced">Advanced Package ($170)</option>
 )}
 </select>
 </div>
 <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-3">
 <label htmlFor="business-description" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
 Business Description
 </label>
 <textarea
 id="business-description"
 value={businessDescription}
 onChange={(e) => setBusinessDescription(e.target.value)}
 rows={4}
 className="border border-[#ebebeb] px-3 py-2 text-sm font-semibold rounded-[0.125rem] focus:outline-none focus:border-[#34088f] bg-white text-black"
 />
 </div>
 </div>
 );
 }}
 </SectionEditWrapper>
 </div>
 );
}
