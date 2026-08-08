"use client"

import { MemberDocumentUpload } from './MemberDocumentUpload'
import { DIAL_CODES } from '@/lib/onboarding/dialCodes'
import type { OnboardingMember, MemberPosition } from '@/types/onboarding'

const POSITION_OPTIONS: { value: MemberPosition; label: string }[] = [
  { value: 'co-founder', label: 'Co-Founder' },
  { value: 'manager', label: 'Manager' },
]

interface MemberFormProps {
  member: OnboardingMember
  showPosition: boolean
  onChange: (updates: Partial<OnboardingMember>) => void
}

export function MemberForm({ member, showPosition, onChange }: MemberFormProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0_8px_24px_rgba(52,8,143,0.04)]">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <InputField
          label="Full Name"
          required
          value={member.fullName}
          onChange={v => onChange({ fullName: v })}
          placeholder="Jane Smith"
        />

        {showPosition && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-800">Position</label>
            <select
              value={member.position ?? 'co-founder'}
              onChange={e => onChange({ position: e.target.value as MemberPosition })}
              className={inputClass}
            >
              {POSITION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className={showPosition ? 'md:col-span-2 xl:col-span-1' : 'md:col-span-2'}>
          <InputField
            label="Address Line"
            required
            value={member.addressLine1}
            onChange={v => onChange({ addressLine1: v })}
            placeholder="Street, city, state, ZIP, country"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-0">
          <label className="text-sm font-semibold text-gray-800">
            WhatsApp Number
            <span className="text-[#34088f] ml-0.5">*</span>
          </label>
          <div className="flex gap-2 min-w-0">
            <select
              value={member.phoneCountryCode || '+92'}
              onChange={e => onChange({ phoneCountryCode: e.target.value })}
              className="w-[80px] flex-shrink-0 appearance-none bg-white border border-gray-200 rounded-lg pl-2.5 pr-7 py-3 text-sm text-gray-900 bg-no-repeat bg-[right_0.625rem_center] focus:outline-none focus:ring-2 focus:ring-[#34088f]/25 focus:border-[#34088f] transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
              aria-label="Country code"
            >
              {DIAL_CODES.map(dc => (
                <option key={dc.iso} value={dc.code}>
                  {dc.code}
                </option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="tel"
              value={member.phoneNumber}
              onChange={e => onChange({ phoneNumber: e.target.value.replace(/[^\d\s-]/g, '') })}
              placeholder="300 1234567"
              className={`${inputClass} flex-1 min-w-0`}
            />
          </div>
        </div>

        <div className="md:col-span-2 xl:col-span-4">
          <MemberDocumentUpload
            memberId={member.id}
            slotKey={member.slotKey}
            documents={member.idDocuments ?? []}
            onChange={docs =>
              onChange({
                idDocuments: docs,
                documentUrl: docs[0]?.url ?? null,
                documentPublicId: docs[0]?.publicId ?? null,
                documentFileName: docs[0]?.fileName ?? null,
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

const inputClass = 'w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/25 focus:border-[#34088f] transition-colors'

function InputField({
  label, required = false, value, onChange, placeholder, type = 'text',
}: {
  label: string; required?: boolean; value: string
  onChange: (v: string) => void; placeholder?: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-[#34088f] ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  )
}
