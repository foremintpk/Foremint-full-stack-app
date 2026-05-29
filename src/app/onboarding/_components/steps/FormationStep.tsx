"use client"

import { STATE_FEES, getStateFee } from '@/lib/onboarding/getStateFees'
import { PackageCard } from '../cards/PackageCard'
import { OrderSummaryBar } from '../ui/OrderSummaryBar'
import type { OnboardingFormData, PublicPackage } from '@/types/onboarding'

interface FormationStepProps {
  formData: OnboardingFormData
  onChange: (updates: Partial<OnboardingFormData>) => void
  packages: PublicPackage[]
  invalidFields?: { formationState?: boolean; selectedPackageId?: boolean }
}

export function FormationStep({ formData, onChange, packages, invalidFields = {} }: FormationStepProps) {
  const handleStateChange = (stateCode: string) => {
    const config = getStateFee(stateCode)
    if (!config) return
    onChange({
      formationState: stateCode,
      formationStateName: config.stateName,
      stateFee: config.fee,
    })
  }

  const handlePackageSelect = (pkg: PublicPackage) => {
    onChange({
      selectedPackageId: pkg.id,
      selectedPackageName: pkg.name,
      packagePrice: pkg.price,
    })
  }

  return (
    <div className="w-full">
      <div className="mb-8 border-b border-gray-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 font-[Manrope]">
          Formation
        </h1>
        <p className="mt-2 text-sm sm:text-[15px] font-medium text-gray-500 leading-relaxed max-w-2xl">
          Select the state where you want to form your LLC and choose a package.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className="space-y-8">
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              State of Formation
            </label>
            <div className="relative ">
              <select
                value={formData.formationState ?? ''}
                onChange={e => handleStateChange(e.target.value)}
                className={[
                  'w-full appearance-none bg-white border rounded-lg px-4 py-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#34088f]/25 focus:border-[#34088f] transition-colors',
                  invalidFields.formationState ? 'border-red-300 bg-red-50/40' : 'border-gray-200',
                ].join(' ')}
              >
                <option value="" disabled>Select a state</option>
                {STATE_FEES.map(s => (
                  <option key={s.stateCode} value={s.stateCode}>
                    {s.stateName}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" stroke="currentColor" strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </section>

          {packages.length > 0 && (
            <section>
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-950">Choose a Package</h2>
              </div>
              <div className={[
                'grid grid-cols-1 md:grid-cols-2 gap-5',
                invalidFields.selectedPackageId ? 'rounded-lg ring-2 ring-red-100' : '',
              ].join(' ')}>
                {packages.map(pkg => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    selected={formData.selectedPackageId === pkg.id}
                    onSelect={() => handlePackageSelect(pkg)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="xl:sticky xl:top-6">
          <OrderSummaryBar
            stateName={formData.formationStateName}
            stateFee={formData.stateFee}
            packageName={formData.selectedPackageName}
            packagePrice={formData.packagePrice}
            addonTotal={0}
          />
        </div>
      </div>
    </div>
  )
}
