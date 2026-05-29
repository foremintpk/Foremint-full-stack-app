import { z } from 'zod';

const phoneRegex = /^\+\d{8,14}$/;

export const step1Schema = z.object({
  entityType: z.enum(['us_llc', 'uk_ltd']),
  memberType: z.enum(['single', 'multi']).optional(),
}).refine(data => {
  if (data.entityType === 'us_llc') return !!data.memberType;
  return true;
}, { 
  message: 'Please select LLC member type.',
  path: ['memberType'] 
});

export const step2Schema = z.object({
  state: z.string().min(2),
  stateName: z.string().min(1),
  stateFee: z.number().min(0),
  package: z.string().min(1),
  packagePrice: z.number().min(0),
  subtotal: z.number().min(0),
});

export const step3Schema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required').max(100),
  secondaryName: z.string().max(100).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(500),
});

export const step4Schema = z.object({
  members: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(2, 'Full name is required'),
    address: z.string().min(5, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State/Region is required'),
    country: z.string().min(1, 'Country is required'),
    position: z.enum(['co-founder', 'manager']).optional(),
    documentUrl: z.string().url('Please upload a passport or ID document'),
    hasProvidedSSN: z.boolean().optional(),
  })).min(1, 'At least one member is required'),
});

export const step5Schema = z.object({
  selectedAddons: z.array(z.string()),
  addonsTotal: z.number(),
  grandTotal: z.number(),
});

export const step6Schema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  phone: z
    .string()
    .regex(
      phoneRegex,
      'Phone must start with + followed by digits only (e.g. +923214567890). Minimum 10 characters.'
    )
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

// Step 7 was Verification, now it is Review
export const step7Schema = z.object({
  confirmed: z.boolean().refine(val => val === true, 'You must confirm the information is correct.'),
});

// Step 8 was Review, now it is Payment
export const step8Schema = z.object({
  paymentMethod: z.enum(['bank_transfer', 'card', 'already_paid']),
  receiptUrl: z.string().optional(),
});
