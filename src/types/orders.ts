export type OrderStatus =
  | 'pending'
  | 'initialized'
  | 'submitted_in_state'
  | 'ein_pending'
  | 'formed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'bank_transfer' | 'already_paid' | 'card' | 'none';

export type AddonId = 'itin' | 'phone' | 'compliance' | 'hosting' | 'address';

export interface SelectedAddon {
  id: AddonId | string;
  title: string;
  billingLabel: string;
  priceCents: number;
  price: number;
}

export interface PricingSnapshot {
  stateFee: number;
  packagePrice: number;
  formationTotal: number;
  addonsTotal: number;
  grandTotal: number;
  addons: SelectedAddon[];
}

export interface Step1Snapshot {
  entityType?: 'us_llc' | 'uk_ltd';
  memberType?: 'single' | 'multi';
}

export interface Step2Snapshot {
  state?: string;
  stateName?: string;
  stateFee?: number;
  package?: string;
  packagePrice?: number;
  packageName?: string;
  subtotal?: number;
}

export interface Step3Snapshot {
  businessName?: string;
  secondaryName?: string;
  website?: string;
  category?: string;
  description?: string;
}

export interface Step4MemberSnapshot {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  position: 'co-founder' | 'manager';
  documentUrl?: string;
  hasProvidedSSN?: boolean;
  // SSN is strictly omitted
}

export interface Step4Snapshot {
  members?: Step4MemberSnapshot[];
}

export interface Step5Snapshot {
  selectedAddons?: string[];
}

export interface Step7Snapshot {
  confirmed?: boolean;
}

export interface Step8Snapshot {
  paymentMethod?: PaymentMethod;
  receiptUrl?: string;
}

export interface FormSnapshot {
  step1?: Step1Snapshot;
  step2?: Step2Snapshot;
  step3?: Step3Snapshot;
  step4?: Step4Snapshot;
  step5?: Step5Snapshot;
  // step6 is explicitly omitted
  step7?: Step7Snapshot;
  step8?: Step8Snapshot;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  company_id?: string;
  service_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_receipt_url?: string;
  
  entity_type?: string;
  member_type?: string;
  formation_state?: string;
  formation_state_name?: string;
  formation_package?: string;
  
  state_fee: number;
  package_price: number;
  formation_total: number;
  addons_total: number;
  grand_total: number;
  
  pricing_snapshot: PricingSnapshot;
  addons_snapshot: SelectedAddon[];
  selected_addons: string[];
  
  form_snapshot?: FormSnapshot;
  
  amount: number;
  notes?: string;
  admin_notes?: string;
  assigned_to?: string;
  
  submitted_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
