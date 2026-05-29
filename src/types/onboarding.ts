// Draft DB record
export interface OnboardingDraftRecord {
  id: string;
  user_id: string | null;
  temp_session_key: string;
  current_step: number;
  form_data: Record<string, unknown>;
  completed_steps: number[];
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// localStorage cache
export interface OnboardingLocalCache {
  temp_session_key: string;
  current_step: number;
  completed_steps: number[];
  form_data: Record<number, unknown>;
  last_synced_at: string;
  expires_at: string;
}

// Step data interfaces
export interface Step1Data {
  entityType?: 'us_llc' | 'uk_ltd';
  memberType?: 'single' | 'multi';
}

export interface Step2Data {
  state?: string;
  stateName?: string;
  stateFee?: number;
  package?: 'standard' | 'advanced';
  packagePrice?: number;
  subtotal?: number;
}

export interface Step3Data {
  businessName?: string;
  secondaryName?: string;
  website?: string;
  category?: string;
  description?: string;
}

export interface Step4Data {
  members?: MemberRecord[];
}

export interface Step5Data {
  selectedAddons?: string[];
  addonsTotal?: number;
  grandTotal?: number;
}

// Step 6: Account Creation + Verification
export interface Step6Data {
  email?: string;
  phone?: string;
  authMethod?: 'email' | 'google' | 'apple';
  userId?: string;
  isNewUser?: boolean;
  emailVerified: boolean;
  phoneVerified?: boolean;
  skippedPhone?: boolean;
}

// Step 7: Review (was Step 8)
export interface Step7Data {
  confirmed?: boolean;
}

// Step 8: Payment (was Step 9)
export interface Step8Data {
  paymentMethod?: 'bank_transfer' | 'card' | 'already_paid';
  receiptUrl?: string;
}

export type CouponDiscountType = 'percentage' | 'amount';

export interface MemberRecord {
  id: string; // client-side UUID
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  position: 'co-founder' | 'manager';
  documentUrl?: string;
  ssn?: string; // only for single member; never persisted to localStorage
}

export type EntityType = 'us-llc' | 'uk-ltd'
export type MemberType = 'single-member' | 'multi-member'

export interface OnboardingFormData {
  // Step 1 — Entity Type
  entityType: EntityType | null
  memberType: MemberType | null

  // Step 2 — Formation
  formationState: string | null          // state code e.g. "DE"
  formationStateName: string | null      // display name e.g. "Delaware"
  stateFee: number                       // fetched from state config, never hardcoded
  selectedPackageId: string | null       // uuid from packages table
  selectedPackageName: string | null     // display name
  packagePrice: number                   // from packages table

  // Step 3 — Business Information
  businessName: string
  secondaryBusinessName: string
  businessWebsite: string
  businessCategory: string
  businessDescription: string

  // Steps 4–7
  members?: OnboardingMember[]
  selectedAddons?: SelectedAddon[]
  addonTotal?: number
  paymentMethod?: PaymentMethod | null
  receiptUrl?: string | null
  receiptPublicId?: string | null
  receiptFileName?: string | null
  couponCode?: string | null
  couponId?: string | null
  couponName?: string | null
  couponDiscountType?: CouponDiscountType | null
  couponDiscountValue?: number | null
  couponDiscountAmount?: number | null
}

export type PaymentMethod = 'bank-transfer' | 'card'

export interface PaymentReceiptData {
  receiptUrl: string | null
  receiptPublicId: string | null
  receiptFileName: string | null
}

export interface OrderSubmissionPayload {
  draftId: string
  tempSessionKey: string
  userId: string
  formData: OnboardingFormData
  receiptUrl: string | null
  receiptPublicId: string | null
}

export interface OrderSubmissionResult {
  success: boolean
  orderId?: string
  orderNumber?: string
  error?: string
}

export type MemberPosition = 'co-founder' | 'manager'

export interface OnboardingMember {
  id: string              // client-side uuid, e.g. crypto.randomUUID()
  fullName: string
  ssnItin: string         // optional, encrypted via onboarding_sensitive_data
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  position?: MemberPosition        // only for multi-member LLC
  documentUrl: string | null       // Cloudinary URL
  documentPublicId: string | null  // Cloudinary public_id
  documentFileName: string | null
  slotKey: string                  // e.g. "member_0_passport"
}

export interface PublicAddon {
  id: string
  name: string
  price: number
  features: string[]
  categoryIds: string[]
  categoryNames: string[]
}

export interface PublicAddonCategory {
  id: string
  name: string
}

export interface SelectedAddon {
  id: string
  name: string
  price: number
}

export interface PublicPackage {
  id: string
  name: string
  price: number
  features: string[]   // string[] from DB text[]
  sortOrder: number
}

export interface StateFeeConfig {
  stateCode: string
  stateName: string
  fee: number
}
