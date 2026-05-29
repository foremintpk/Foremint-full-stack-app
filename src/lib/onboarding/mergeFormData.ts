import type {
  OnboardingFormData,
  OnboardingMember,
  SelectedAddon,
  PaymentMethod,
} from '@/types/onboarding'

const EMPTY_FORM: OnboardingFormData = {
  entityType: null,
  memberType: null,
  formationState: null,
  formationStateName: null,
  stateFee: 0,
  selectedPackageId: null,
  selectedPackageName: null,
  packagePrice: 0,
  businessName: '',
  secondaryBusinessName: '',
  businessWebsite: '',
  businessCategory: '',
  businessDescription: '',
  members: [],
  selectedAddons: [],
  addonTotal: 0,
  paymentMethod: null,
  receiptUrl: null,
  receiptPublicId: null,
  receiptFileName: null,
  couponCode: null,
  couponId: null,
  couponName: null,
  couponDiscountType: null,
  couponDiscountValue: null,
  couponDiscountAmount: null,
}

function normalizeMember(raw: Record<string, unknown>, index: number): OnboardingMember {
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    fullName: String(raw.fullName ?? raw.name ?? ''),
    ssnItin: String(raw.ssnItin ?? ''),
    addressLine1: String(raw.addressLine1 ?? raw.address ?? ''),
    addressLine2: String(raw.addressLine2 ?? ''),
    city: String(raw.city ?? ''),
    state: String(raw.state ?? ''),
    postalCode: String(raw.postalCode ?? ''),
    country: String(raw.country ?? ''),
    position: raw.position as OnboardingMember['position'],
    documentUrl: (raw.documentUrl as string) ?? null,
    documentPublicId: (raw.documentPublicId as string) ?? null,
    documentFileName: (raw.documentFileName as string) ?? null,
    slotKey: String(raw.slotKey ?? `member_${index}_passport`),
  }
}

function normalizeAddons(step5: Record<string, unknown>): SelectedAddon[] {
  const raw = step5.selectedAddons
  if (!Array.isArray(raw) || raw.length === 0) return []

  if (typeof raw[0] === 'object' && raw[0] !== null && 'id' in (raw[0] as object)) {
    return (raw as SelectedAddon[]).map(a => ({
      id: a.id,
      name: a.name ?? (a as { title?: string }).title ?? 'Add-on',
      price: Number(a.price ?? 0),
    }))
  }

  const detail = step5.selectedAddonsDetail as Array<{
    id: string
    title?: string
    name?: string
    price: number
  }> | undefined

  if (detail?.length) {
    return detail.map(a => ({
      id: a.id,
      name: a.name ?? a.title ?? 'Add-on',
      price: Number(a.price ?? 0),
    }))
  }

  return []
}

/** Merge per-step context cache into a single OnboardingFormData object. */
export function mergeFormDataFromSteps(
  formDataByStep: Record<number, unknown>
): OnboardingFormData {
  const s1 = (formDataByStep[1] ?? {}) as Record<string, unknown>
  const s2 = (formDataByStep[2] ?? {}) as Record<string, unknown>
  const s3 = (formDataByStep[3] ?? {}) as Record<string, unknown>
  const s4 = (formDataByStep[4] ?? {}) as Record<string, unknown>
  const s5 = (formDataByStep[5] ?? {}) as Record<string, unknown>
  const s7 = (formDataByStep[7] ?? {}) as Record<string, unknown>

  const rawMembers = Array.isArray(s4.members) ? s4.members : []
  const selectedAddons = normalizeAddons(s5)
  const addonTotal = Number(
    s5.addonTotal ?? s5.addonsTotal ?? selectedAddons.reduce((s, a) => s + a.price, 0)
  )

  return {
    ...EMPTY_FORM,
    entityType: (s1.entityType as OnboardingFormData['entityType']) ?? null,
    memberType: (s1.memberType as OnboardingFormData['memberType']) ?? null,
    formationState: (s2.formationState as string) ?? (s2.state as string) ?? null,
    formationStateName: (s2.formationStateName as string) ?? (s2.stateName as string) ?? null,
    stateFee: Number(s2.stateFee ?? 0),
    selectedPackageId: (s2.selectedPackageId as string) ?? (s2.package as string) ?? null,
    selectedPackageName: (s2.selectedPackageName as string) ?? (s2.packageName as string) ?? null,
    packagePrice: Number(s2.packagePrice ?? 0),
    businessName: String(s3.businessName ?? ''),
    secondaryBusinessName: String(s3.secondaryBusinessName ?? s3.secondaryName ?? ''),
    businessWebsite: String(s3.businessWebsite ?? s3.website ?? ''),
    businessCategory: String(s3.businessCategory ?? s3.category ?? ''),
    businessDescription: String(s3.businessDescription ?? s3.description ?? ''),
    members: rawMembers.map((m, i) => normalizeMember(m as Record<string, unknown>, i)),
    selectedAddons,
    addonTotal,
    paymentMethod: (s7.paymentMethod as PaymentMethod) ?? null,
    receiptUrl: (s7.receiptUrl as string) ?? null,
    receiptPublicId: (s7.receiptPublicId as string) ?? null,
    receiptFileName: (s7.receiptFileName as string) ?? null,
    couponCode: (s7.couponCode as string) ?? null,
    couponId: (s7.couponId as string) ?? null,
    couponName: (s7.couponName as string) ?? null,
    couponDiscountType: (s7.couponDiscountType as 'percentage' | 'amount') ?? null,
    couponDiscountValue: Number(s7.couponDiscountValue ?? 0) || null,
    couponDiscountAmount: Number(s7.couponDiscountAmount ?? 0) || null,
  }
}
