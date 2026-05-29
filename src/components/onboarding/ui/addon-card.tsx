'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Smartphone, Shield, Server, MapPin, CreditCard, User } from 'lucide-react';

interface AddonItem {
  id: string;
  title: string;
  price: number;
  priceLabel: string;
  icon: string;
  bullets: string[];
}

interface AddonCardProps {
  addon: AddonItem;
  isSelected: boolean;
  onToggle: () => void;
}

const ICON_MAP: Record<string, any> = {
  identification: User,
  phone: Smartphone,
  server: Server,
  'map-pin': MapPin,
  'credit-card': CreditCard,
};

export function AddonCard({ addon, isSelected, onToggle }: AddonCardProps) {
  const Icon = ICON_MAP[addon.icon] || Shield;

  return (
    <div
      onClick={onToggle}
      className={cn(
        "relative flex flex-col p-8 border transition-all duration-300 cursor-pointer rounded-sm group",
        isSelected 
          ? "border-[#34088f] bg-[#F5F0FF] border-2 ring-4 ring-[#34088f]/5" 
          : "border-gray-200 bg-white hover:border-[#34088f]/50 hover:bg-[#F5F0FF]/20"
      )}
    >
      {/* Checkbox Indicator */}
      <div className={cn(
        "absolute top-6 right-6 w-6 h-6 border-2 rounded-sm flex items-center justify-center transition-all duration-300",
        isSelected ? "bg-[#34088f] border-[#34088f]" : "border-gray-200 bg-white"
      )}>
        {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
      </div>

      <div className="flex items-start gap-5 mb-6">
        <div className={cn(
          "p-3 rounded-sm transition-colors duration-300",
          isSelected ? "bg-[#34088f] text-white" : "bg-gray-50 text-gray-400 group-hover:text-[#34088f]"
        )}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="pt-1">
          <h3 className="text-[18px] font-black uppercase tracking-tight text-black font-manrope leading-none mb-2">
            {addon.title}
          </h3>
          <p className="text-[13px] font-black uppercase tracking-widest text-[#34088f] font-inter">
            {addon.priceLabel}
          </p>
        </div>
      </div>

      <ul className="space-y-3 mb-4">
        {addon.bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-3 text-[13px] font-medium text-gray-500 leading-snug font-inter">
            <div className="w-1 h-1 rounded-full bg-[#34088f]/40 mt-2 shrink-0" />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}
