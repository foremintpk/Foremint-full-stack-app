"use client"

import type React from 'react'
import type { OnboardingFormData } from '@/types/onboarding'

const BUSINESS_CATEGORIES = [
  'Agriculture & Farming',
  'Arts & Entertainment',
  'Automotive',
  'Beauty & Personal Care',
  'Construction & Contracting',
  'Consulting & Professional Services',
  'E-commerce & Retail',
  'Education & Training',
  'Finance & Insurance',
  'Food & Beverage',
  'Healthcare & Medical',
  'Hospitality & Travel',
  'Information Technology',
  'Legal Services',
  'Manufacturing',
  'Marketing & Advertising',
  'Media & Publishing',
  'Non-Profit & Social Services',
  'Real Estate',
  'Staffing & Recruiting',
  'Technology & Software',
  'Transportation & Logistics',
  'Other',
]

interface BusinessInformationStepProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
  invalidFields?: Partial<Record<keyof OnboardingFormData, boolean>>
}

export function BusinessInformationStep({
  formData,
  onChange,
  invalidFields = {},
}: BusinessInformationStepProps) {
  return (
    <div className="w-full">
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 font-[Manrope]">
          Business Information
        </h1>
        <p className="mt-2 text-sm sm:text-[15px] font-medium text-gray-500 leading-relaxed max-w-2xl">
          Add the core details we need for your company filing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl">
        <FormField label="Business Name" required>
          <input
            type="text"
            value={formData.businessName || ''}
            onChange={e => onChange({ businessName: e.target.value })}
            placeholder="e.g. Ethan Walker"
            className={inputClass(invalidFields.businessName)}
            maxLength={100}
          />
        </FormField>

        <FormField label="Secondary Business Name">
          <input
            type="text"
            value={formData.secondaryBusinessName || ''}
            onChange={e => onChange({ secondaryBusinessName: e.target.value })}
            placeholder="Optional alternate name"
            className={inputClass(false)}
            maxLength={100}
          />
        </FormField>

        <FormField label="Business Category" required>
          <div className="relative">
            <select
              value={formData.businessCategory || ''}
              onChange={e => onChange({ businessCategory: e.target.value })}
              className={`${inputClass(invalidFields.businessCategory)} appearance-none pr-10`}
            >
              <option value="">Select a category</option>
              {BUSINESS_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </FormField>

        <FormField label="Business Website">
          <input
            type="url"
            value={formData.businessWebsite || ''}
            onChange={e => onChange({ businessWebsite: e.target.value })}
            placeholder="https://example.com"
            className={inputClass(false)}
          />
        </FormField>

        <div className="lg:col-span-2">
          <FormField label="Business Description" required>
            <textarea
              value={formData.businessDescription || ''}
              onChange={e => onChange({ businessDescription: e.target.value })}
              placeholder="Describe what your business does, who it serves, and the main activities."
              rows={7}
              maxLength={700}
              className={`${inputClass(invalidFields.businessDescription)} min-h-[170px] resize-y`}
            />
            <span className="text-xs text-gray-400 mt-1 text-right block font-inter font-medium">
              {(formData.businessDescription || '').length}/700
            </span>
          </FormField>
        </div>
      </div>
    </div>
  )
}

function inputClass(invalid?: boolean) {
  return [
    'w-full bg-white border rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors duration-150',
    invalid
      ? 'border-red-300 bg-red-50/40 focus:ring-red-100 focus:border-red-500'
      : 'border-gray-200 focus:ring-[#34088f]/25 focus:border-[#34088f]',
  ].join(' ')
}

function FormField({
  label, required = false, children,
}: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-[#34088f] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
