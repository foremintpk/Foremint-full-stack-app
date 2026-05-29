// Server Component

import { Check } from 'lucide-react'
import { OnboardingStep } from '../_config/steps'
import { OnboardingProgressCircle } from './OnboardingProgressCircle'

interface OnboardingNavItemProps {
  step: OnboardingStep
  isCompleted: boolean
  isActive: boolean
  isUpcoming: boolean
  isLast: boolean
}

export function OnboardingNavItem({
  step,
  isCompleted,
  isActive,
  isUpcoming,
  isLast,
}: OnboardingNavItemProps) {
  const isAccessible = isCompleted || isActive

  return (
    <div
      className={`flex flex-col ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'}`}
      data-nav-step={step.index}
    >

      {/* Step row */}
      <div className="flex items-center gap-3 py-1 group">

        {/* Circle indicator */}
        <div className="w-6 h-6 shrink-0 flex-shrink-0 flex items-center justify-center transition-transform duration-150 group-hover:scale-105">
          {isCompleted && (
            // Completed: white circle, brand checkmark
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
              <Check size={14} className="text-[#34088f] stroke-[2.5]" />
            </div>
          )}

          {isActive && (
            // Active: animated circle (client component)
            <div className="w-6 h-6 flex items-center justify-center shrink-0 ">
              <OnboardingProgressCircle />
            </div>
          )}

          {isUpcoming && (
            // Upcoming: white border circle, white number
            <div className="w-6 h-6 rounded-full border-2 border-white/25 flex items-center justify-center shrink-0">
              <span className="text-white/40 text-[13px] font-medium font-inter">
                {step.index}
              </span>
            </div>
          )}
        </div>

        {/* Text block */}
        <div className="flex flex-col min-w-0">
          <span
            className={[
              'text-[13px] leading-tight truncate font-inter transition-colors duration-150',
              isActive ? 'text-white font-semibold' : '',
              isCompleted ? 'text-white/80 font-medium group-hover:text-white' : '',
              isUpcoming ? 'text-white/40 font-normal' : '',
            ].join(' ')}
          >
            {step.label}
          </span>
          <span
            className={[
              'text-[11px] leading-tight mt-0.5 truncate font-inter transition-colors duration-150',
              isActive ? 'text-white/70' : '',
              isCompleted ? 'text-white/50' : '',
              isUpcoming ? 'text-white/30' : '',
            ].join(' ')}
          >
            {step.description}
          </span>
        </div>
      </div>

      {/* Connector line between steps (not on last item) */}
      {!isLast && (
        <div className="w-6 flex justify-center py-1">
          <div
            className={[
              'w-px h-5',
              isCompleted ? 'bg-white/50' : 'bg-white/15',
            ].join(' ')}
          />
        </div>
      )}

    </div>
  )
}
