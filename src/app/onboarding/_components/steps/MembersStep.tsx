"use client"

import { useCallback, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { MemberForm } from '../members/MemberForm'
import type { OnboardingFormData, OnboardingMember } from '@/types/onboarding'

interface MembersStepProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
}

function createMember(index: number, isMultiMember: boolean): OnboardingMember {
  return {
    id: crypto.randomUUID(),
    fullName: '',
    ssnItin: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    position: isMultiMember ? 'co-founder' : undefined,
    documentUrl: null,
    documentPublicId: null,
    documentFileName: null,
    slotKey: `member_${index}_passport`,
  }
}

export function MembersStep({ formData, onChange }: MembersStepProps) {
  const isSingleMember = formData.memberType === 'single-member'
  const isMultiMember = formData.memberType === 'multi-member'
  const members = formData.members ?? []

  useEffect(() => {
    if (members.length === 0) {
      onChange({ members: [createMember(0, isMultiMember)] })
    } else if (isMultiMember && members.length === 1) {
      onChange({ members: [...members, createMember(1, true)] })
    }
  }, [isMultiMember, members, onChange])

  const addMember = useCallback(() => {
    onChange({ members: [...members, createMember(members.length, isMultiMember)] })
  }, [members, isMultiMember, onChange])

  const updateMember = useCallback((id: string, updates: Partial<OnboardingMember>) => {
    onChange({
      members: members.map(m => m.id === id ? { ...m, ...updates } : m)
    })
  }, [members, onChange])

  const removeMember = useCallback((id: string) => {
    if (members.length <= (isSingleMember ? 1 : 2)) return
    onChange({ members: members.filter(m => m.id !== id) })
  }, [members, isSingleMember, onChange])

  return (
    <div className="w-full">
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 font-[Manrope]">
          Members
        </h1>
        <p className="mt-2 text-sm sm:text-[15px] font-medium text-gray-500 leading-relaxed max-w-2xl">
          {isSingleMember
            ? 'Provide the owner details for this LLC.'
            : 'Add each LLC member. Multi Member LLCs require at least 2 members.'}
        </p>
      </div>

      <div className="space-y-5">
        {members.map((member, index) => (
          <section key={member.id}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-gray-900">
                {isSingleMember ? 'Owner Information' : `Member ${index + 1}`}
              </h2>
              {isMultiMember && members.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              )}
            </div>
            <MemberForm
              member={member}
              showPosition={isMultiMember}
              onChange={(updates) => updateMember(member.id, updates)}
            />
          </section>
        ))}
      </div>

      {isMultiMember && (
        <button
          type="button"
          onClick={addMember}
          className="
            mt-6 flex items-center gap-2 text-sm font-semibold
            text-[#34088f] border border-dashed border-[#34088f]/35
            hover:border-[#34088f] hover:bg-[#f4f0fe]/70
            rounded-lg px-4 py-3 w-full justify-center
            transition-colors duration-150
          "
        >
          <Plus size={16} />
          Add Member
        </button>
      )}

      {isMultiMember && members.length < 2 && (
        <p className="text-xs text-amber-700 mt-3 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
          At least 2 members are required for a Multi Member LLC.
        </p>
      )}
    </div>
  )
}
