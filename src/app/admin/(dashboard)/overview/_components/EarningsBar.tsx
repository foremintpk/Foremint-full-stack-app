/**
 * @file src/app/admin/(dashboard)/overview/_components/EarningsBar.tsx
 * @description Smooth, interactive percentage metric bar supporting accessibility tags and entrance transitions.
 * 
 * 1. Server vs Client choice rationale: Client Component ("use client") for animated width transitions on mount.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { formatPKR } from '@/lib/admin/formatters';

interface EarningsBarProps {
    label: string;
    amount: number;
    percent: number;
    colorClass: string;
}

export function EarningsBar({
    label,
    amount,
    percent,
    colorClass,
}: EarningsBarProps) {
    const [animatedWidth, setAnimatedWidth] = useState(0);

    // Trigger smooth entrance animation on client mounting
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedWidth(percent);
        }, 50);
        return () => clearTimeout(timer);
    }, [percent]);

    return (
        <div className="space-y-2">
            {/* Label and statistics summary Row */}
            <div className="flex items-center justify-between text-xs font-inter">
                <span className="text-gray-500 font-medium">{label}</span>
                <div className="flex items-center gap-2">
                    <span
                        className="text-black font-bold"
                        aria-label={`${label} earnings: $ ${(amount)}`}
                    >
                        {`$ ${amount}`}
                    </span>
                    <span className="text-gray-400 font-medium">({percent}%)</span>
                </div>
            </div>

            {/* Progress Track */}
            <div
                role="meter"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label} earnings breakdown percentage`}
                className="h-2.5 bg-gray-100 rounded-full w-full overflow-hidden"
            >
                {/* Fill portion with animated entrance width */}
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out`}
                    style={{
                        width: `${animatedWidth}%`,
                        backgroundColor: colorClass,
                    }}
                />
            </div>
        </div>
    );
}
