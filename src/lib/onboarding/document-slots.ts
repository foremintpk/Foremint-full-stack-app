export type DocumentType =
  | 'government_id'
  | 'selfie'
  | 'proof_of_address'
  | 'ein_letter'
  | 'articles_of_org';

export interface DocumentSlot {
  type: DocumentType;
  label: string;
  description: string;
  required: boolean;
  acceptedTypes: string[];       // MIME types
  maxSizeMB: number;
}

export const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    type: 'government_id',
    label: 'Government-Issued ID',
    description: 'Passport, Driver\'s License, or State ID (front side)',
    required: true,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeMB: 10,
  },
  {
    type: 'selfie',
    label: 'Selfie with ID',
    description: 'A clear photo of you holding your ID next to your face',
    required: true,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMB: 10,
  },
  {
    type: 'proof_of_address',
    label: 'Proof of Address',
    description: 'Utility bill, bank statement, or lease (dated within 90 days)',
    required: true,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeMB: 15,
  },
  {
    type: 'ein_letter',
    label: 'EIN Confirmation Letter',
    description: 'IRS CP 575 or 147C letter confirming your EIN (optional)',
    required: false,
    acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeMB: 10,
  },
  {
    type: 'articles_of_org',
    label: 'Articles of Organization',
    description: 'State-issued formation document for your LLC or Corporation (optional)',
    required: false,
    acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeMB: 20,
  },
];

export const REQUIRED_DOCUMENT_TYPES = DOCUMENT_SLOTS
  .filter((s) => s.required)
  .map((s) => s.type);
