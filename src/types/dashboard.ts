import type { Database } from './database';

export type UserRole = Database['public']['Enums']['user_role'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type OrderStatus = Database['public']['Enums']['order_status'];

export interface CustomerLlcItem {
  id: string; // orderId
  companyId: string | null;
  llcName: string;
  status: OrderStatus;
  formationState: string | null;
  formationStateName: string | null;
  renewalDate: string | null;
  pendingAmount: number;
  paymentStatus: string;
  complianceState: 'compliant' | 'action_required' | 'renewal_due' | 'unknown';
}

export interface CustomerActionRequired {
  id: string; // uuid of the resubmission request or invoice or document request
  type: 'document_resubmission' | 'invoice_payment' | 'compliance_task' | 'renewal_payment';
  title: string;
  description: string;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  llcId: string; // linked orderId
  llcName: string;
  metadata: {
    fieldName?: string;
    memberIndex?: number | null;
    note?: string | null;
    amount?: number;
    invoiceNumber?: string;
    [key: string]: any;
  };
}

export interface CustomerInvoiceItem {
  id: string; // invoice or order id
  invoiceNumber: string;
  date: string;
  name: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'partial';
  type: 'order' | 'manual';
  notes: string | null;
  downloadUrl?: string | null;
}

export interface CustomerNotification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  category: 'billing' | 'compliance' | 'renewal' | 'document' | 'general';
}

export interface CustomerDashboardStats {
  totalLlcs: number;
  activeLlcs: number;
  pendingActions: number;
  pendingPayments: number;
  upcomingRenewals: number;
}

export interface CustomerDashboardData {
  stats: CustomerDashboardStats;
  llcs: CustomerLlcItem[];
  actions: CustomerActionRequired[];
  notifications: CustomerNotification[];
  invoices: CustomerInvoiceItem[];
  profile: Profile;
}
