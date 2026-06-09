"use client"

import { MemberDocumentUpload } from './MemberDocumentUpload'
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

        <div className="md:col-span-2 xl:col-span-4">
          <MemberDocumentUpload
            memberId={member.id}
            slotKey={member.slotKey}
            existingUrl={member.documentUrl}
            existingFileName={member.documentFileName}
            onUploaded={(url, publicId, fileName) =>
              onChange({ documentUrl: url, documentPublicId: publicId, documentFileName: fileName })
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
