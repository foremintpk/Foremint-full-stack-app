import { z } from 'zod';

export const step1Schema = z.object({
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone number format'),
  date_of_birth: z
    .string()
    .optional(),
  address_line1: z.string().min(3, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postal_code: z.string().min(3, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
});

export const step2Schema = z.object({
  company_name: z.string().min(2, 'Company name is required'),
  company_type: z.enum([
    'LLC',
    'Corporation',
    'S-Corp',
    'Sole Proprietor',
    'Partnership',
    'Non-Profit',
    'Other',
  ]),
  ein: z
    .string()
    .regex(/^\d{2}-\d{7}$/, 'EIN must be in format XX-XXXXXXX')
    .optional()
    .or(z.literal('')),
  industry: z.string().min(1, 'Industry is required'),
  company_state: z.string().min(1, 'State of formation is required'),
  company_website: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  employees_count: z.enum(['1', '2-10', '11-50', '51-200', '200+']),
});

export const step3Schema = z.object({
  services_needed: z
    .array(z.string())
    .min(1, 'Please select at least one service'),
  referral_source: z.string().optional().or(z.literal('')),
  additional_notes: z.string().max(1000, 'Max 1000 characters').optional().or(z.literal('')),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
