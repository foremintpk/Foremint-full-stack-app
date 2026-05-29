import { ONBOARDING_STEPS } from '../_config/steps'
import { OnboardingNavItem } from './OnboardingNavItem'

interface OnboardingSidebarProps {
  currentStep: number
  completedSteps: number[]
}

export function OnboardingSidebar({ currentStep, completedSteps }: OnboardingSidebarProps) {
  return (
    <div className="w-[280px] h-full bg-[#34088f] p-8 flex flex-col justify-between hidden lg:flex rounded-xl ">
      <div>
        {/* Logo area */}
        <div className="mb-8 flex items-center justify-between">
          <span className="text-[16px] font-black uppercase tracking-tighter text-white font-manrope">
            Foremint
          </span>
        </div>

        {/* Step navigation */}
        <nav className="flex flex-col gap-0">
          {ONBOARDING_STEPS.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.index) && step.index < currentStep
            const isActive = currentStep === step.index
            const isUpcoming = step.index > currentStep

            return (
              <OnboardingNavItem
                key={step.key}
                step={step}
                isCompleted={isCompleted}
                isActive={isActive}
                isUpcoming={isUpcoming}
                isLast={idx === ONBOARDING_STEPS.length - 1}
              />
            )
          })}
        </nav>
      </div>

      {/* Bottom decorative area */}
      <div className="mt-auto pt-6">
        <div className="w-full h-px bg-white/10 mb-4" />
        <p className="text-white/40 text-[11px] font-inter leading-relaxed">
          Your progress is saved automatically
        </p>
      </div>
    </div>
  )
}

