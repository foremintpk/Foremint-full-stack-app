export type OnboardingStepKey =
  | 'entity-type'
  | 'formation'
  | 'business-information'
  | 'members'
  | 'add-ons'
  | 'review'
  | 'payment'

export interface OnboardingStep {
  key: OnboardingStepKey
  label: string
  description: string
  index: number // 1-based, maps to onboarding_drafts.current_step
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { key: 'entity-type',          label: 'Entity Type',          description: 'Choose your business structure',  index: 1 },
  { key: 'formation',            label: 'Formation',            description: 'Select state and package',        index: 2 },
  { key: 'business-information', label: 'Business Information', description: 'Name, category & description',   index: 3 },
  { key: 'members',              label: 'Members',              description: 'Add owners and managers',         index: 4 },
  { key: 'add-ons',              label: 'Add-ons',              description: 'Optional services',              index: 5 },
  { key: 'review',               label: 'Review',               description: 'Confirm your details',           index: 6 },
  { key: 'payment',              label: 'Payment',              description: 'Complete your order',            index: 7 },
]
