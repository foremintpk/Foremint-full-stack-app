"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useOnboarding } from '@/context/onboarding-context'
import { ONBOARDING_STEPS } from '../_config/steps'
import { OnboardingSidebar } from './OnboardingSidebar'
import { OnboardingBackButton } from './OnboardingBackButton'
import { OnboardingContinueButton } from './OnboardingContinueButton'

interface OnboardingShellProps {
  children: React.ReactNode
}

export function OnboardingShell({ children }: OnboardingShellProps) {
  const router = useRouter()
  const { currentStep, state } = useOnboarding()
  const completedSteps = state.completedSteps || []

  const handleStepClick = (targetStep: number) => {
    // Always allow going backward
    if (targetStep < currentStep) {
      router.push(`/onboarding/step/${targetStep}`)
      return
    }
    // Allow going to next step only if current is completed
    if (targetStep === currentStep + 1) {
      if (completedSteps.includes(currentStep)) {
        router.push(`/onboarding/step/${targetStep}`)
      } else {
        toast.error('Please complete the current step first')
      }
      return
    }
    // Block jumping ahead multiple steps
    toast.error('Please complete the current step first')
  }

  // Set up global click listener for any sidebar nav click to enforce navigation guards
  React.useEffect(() => {
    const handleSidebarClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const navItem = target.closest('[data-step-index]')
      if (navItem) {
        e.preventDefault()
        const targetStep = parseInt(navItem.getAttribute('data-step-index') || '1', 10)
        handleStepClick(targetStep)
      }
    }
    document.addEventListener('click', handleSidebarClick)
    return () => document.removeEventListener('click', handleSidebarClick)
  }, [currentStep, completedSteps])

  const activeStepLabel = ONBOARDING_STEPS.find(s => s.index === currentStep)?.label || ''

  return (
    <div className="flex h-screen w-full flex-col lg:flex-row bg-gray-50 font-inter p-2 sm:p-3 gap-3 overflow-hidden">

      {/* MOBILE: compact horizontal progress strip (visible < lg) */}
      <div className="lg:hidden bg-[#34088f] px-6 py-4 flex items-center gap-3 rounded-xl shrink-0">
        <div className="flex items-center gap-1.5">
          {ONBOARDING_STEPS.map((step) => (
            <button
              key={step.key}
              onClick={() => handleStepClick(step.index)}
              className={[
                'rounded-full transition-all duration-300',
                (completedSteps.includes(step.index) && step.index < currentStep) || currentStep === step.index
                  ? 'w-2 h-2 bg-white'
                  : 'w-1.5 h-1.5 bg-white/30'
              ].join(' ')}
            />
          ))}
        </div>
        <span className="text-white/80 text-[13px] font-medium font-inter">
          {activeStepLabel}
        </span>
      </div>

      {/* DESKTOP: Brand sidebar panel */}
      <div className="hidden lg:block w-[260px] xl:w-[280px] flex-shrink-0 h-full bg-[#34088f] rounded-xl overflow-hidden">
        {/* We add data-step-index to the container items to handle clicks elegantly via event delegation */}
        <div className="h-full" onClick={(e) => {
          const item = (e.target as HTMLElement).closest('[data-nav-step]')
          if (item) {
            const stepIdx = parseInt(item.getAttribute('data-nav-step') || '1', 10)
            handleStepClick(stepIdx)
          }
        }}>
          <OnboardingSidebar currentStep={currentStep} completedSteps={completedSteps} />
        </div>
      </div>

      {/* RIGHT — Content area */}
      <div className="flex-1 flex flex-col bg-white h-full rounded-xl overflow-hidden min-w-0">

        {/* Top bar: Back button left, optional step indicator right */}
        <div className="flex items-center justify-between px-5 sm:px-7 lg:px-8 xl:px-10 pt-5 pb-3 shrink-0">
          <OnboardingBackButton currentStep={currentStep} />
          {/* Subtle muted step indicator — text only, no bar */}
          <span className="text-[11px] text-gray-400 font-medium font-inter">
            Step {currentStep} of {ONBOARDING_STEPS.length}
          </span>
        </div>

        {/* Scrollable step content */}
        <div
          key={currentStep} // triggers remount + fade animation on step change
          className="flex-1 overflow-y-auto px-5 sm:px-7 lg:px-8 xl:px-10 pb-8 step-content-enter"
        >
          {children}
        </div>

        {/* Bottom bar: Continue button pinned to bottom-right */}
        <div className="px-5 sm:px-7 lg:px-8 xl:px-10 py-5 flex justify-end border-t border-gray-100 shrink-0">
          <OnboardingContinueButton
            currentStep={currentStep}
            totalSteps={ONBOARDING_STEPS.length}
          />
        </div>

      </div>

    </div>
  )
}
