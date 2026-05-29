import { AddonId, SelectedAddon, PricingSnapshot } from '@/types/orders';

export interface AddonDefinition {
  id: AddonId;
  title: string;
  description: string[];
  price: number;
  priceCents: number;
  billingType: 'one_time' | 'monthly';
  billingLabel: string;
}

export const ADDON_REGISTRY: Record<AddonId, AddonDefinition> = {
  itin: {
    id: 'itin',
    title: 'ITIN Application',
    description: ['Get an Individual Taxpayer Identification Number'],
    price: 150,
    priceCents: 15000,
    billingType: 'one_time',
    billingLabel: 'One-time',
  },
  phone: {
    id: 'phone',
    title: 'US Phone Number',
    description: ['Real US number for business verification'],
    price: 10,
    priceCents: 1000,
    billingType: 'monthly',
    billingLabel: '/ month',
  },
  compliance: {
    id: 'compliance',
    title: 'Compliance Guard',
    description: ['Annual report filings and deadline reminders'],
    price: 99,
    priceCents: 9900,
    billingType: 'one_time', // Annual actually, but for pricing snapshot we'll use one_time as billed yearly
    billingLabel: '/ year',
  },
  hosting: {
    id: 'hosting',
    title: 'Cloud Hosting',
    description: ['Premium VPS hosting for your business'],
    price: 29,
    priceCents: 2900,
    billingType: 'monthly',
    billingLabel: '/ month',
  },
  address: {
    id: 'address',
    title: 'Virtual Address',
    description: ['Premium physical street address with mail forwarding'],
    price: 15,
    priceCents: 1500,
    billingType: 'monthly',
    billingLabel: '/ month',
  },
};

export function resolveSelectedAddons(ids: string[]): SelectedAddon[] {
  return ids
    .filter((id): id is AddonId => id in ADDON_REGISTRY)
    .map(id => {
      const def = ADDON_REGISTRY[id];
      return {
        id: def.id,
        title: def.title,
        billingLabel: def.billingLabel,
        priceCents: def.priceCents,
        price: def.price,
      };
    });
}

export interface PricingInput {
  stateFee?: number;
  packagePrice?: number;
  selectedAddonIds?: string[];
  dbAddons?: Array<{
    id: string;
    title: string;
    price: number;
    billingLabel?: string;
    priceCents?: number;
  }>;
}

export function buildPricingSnapshot({
  stateFee = 0,
  packagePrice = 0,
  selectedAddonIds = [],
  dbAddons,
}: PricingInput): PricingSnapshot {
  const safeStateFee = typeof stateFee === 'number' && isFinite(stateFee) ? stateFee : 0;
  const safePackagePrice = typeof packagePrice === 'number' && isFinite(packagePrice) ? packagePrice : 0;
  
  const formationTotal = safeStateFee + safePackagePrice;
  
  let addons: SelectedAddon[] = [];
  if (dbAddons && dbAddons.length > 0) {
    addons = dbAddons.map(addon => {
      const titleLower = addon.title.toLowerCase();
      const isMonthly = titleLower.includes('phone') || titleLower.includes('hosting') || titleLower.includes('vps') || titleLower.includes('address') || titleLower.includes('trading');
      return {
        id: addon.id as any,
        title: addon.title,
        billingLabel: addon.billingLabel || (isMonthly ? '/ month' : 'One-time'),
        priceCents: addon.priceCents || Math.round(addon.price * 100),
        price: addon.price,
      };
    });
  } else {
    addons = resolveSelectedAddons(selectedAddonIds);
  }
  
  const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
  const grandTotal = formationTotal + addonsTotal;

  return {
    stateFee: safeStateFee,
    packagePrice: safePackagePrice,
    formationTotal,
    addonsTotal,
    grandTotal,
    addons,
  };
}

export function safeFormatUSD(amount: unknown): string {
  const num = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}
