'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, LayoutDashboard, Building2, FileText,
  Package, Users, CreditCard, Bell, Hash, Calendar,
} from 'lucide-react';
import type { OrderDetail, Addon, Package as PkgType, AdminRole } from '@/types/admin';
import type { BillingEntry } from '@/lib/admin/actions/addBillingEntry';
import type { ClientNotification } from '@/lib/admin/actions/manageClientNotifications';
import type { OrderTicket } from '@/lib/admin/actions/manageTickets';
import { StatusDropdown } from './StatusDropdown';

import { OverviewTab }          from './tabs/OverviewTab';
import { FormationDetailsTab }  from './tabs/FormationDetailsTab';
import { DocumentsTab }         from './tabs/DocumentsTab';
import { AddonsTab }            from './tabs/AddonsTab';
import { MembersTab }           from './tabs/MembersTab';
import { BillingTab }           from './tabs/BillingTab';
import { NotificationsTab }     from './tabs/NotificationsTab';

// ─── Tab config ──────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'formation' | 'documents' | 'addons' | 'members' | 'billing' | 'notifications';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview',       label: 'Overview',       icon: LayoutDashboard },
  { key: 'formation',      label: 'Formation',      icon: Building2 },
  { key: 'documents',      label: 'Documents',      icon: FileText },
  { key: 'addons',         label: 'Add-ons',        icon: Package },
  { key: 'members',        label: 'Members',        icon: Users },
  { key: 'billing',        label: 'Billing',        icon: CreditCard },
  { key: 'notifications',  label: 'Notifications',  icon: Bell },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface OrderDetailTabsClientProps {
  order: OrderDetail;
  internalData: any;
  packages: PkgType[];
  allAddons: Addon[];
  adminId: string;
  adminRole: AdminRole;
  billingEntries: BillingEntry[];
  notifications: ClientNotification[];
  tickets: OrderTicket[];
}

export function OrderDetailTabsClient({
  order: initialOrder,
  internalData: initialInternalData,
  packages,
  allAddons,
  adminId,
  adminRole,
  billingEntries: initialBillingEntries,
  notifications: initialNotifications,
  tickets: initialTickets,
}: OrderDetailTabsClientProps): React.JSX.Element {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Local state — synced from server props after router.refresh()
  const [order, setOrder] = useState(initialOrder);
  const [internalData, setInternalData] = useState(initialInternalData);
  const [billingEntries, setBillingEntries] = useState(initialBillingEntries);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [tickets, setTickets] = useState(initialTickets);

  // Sync from server when props update (after router.refresh())
  useEffect(() => setOrder(initialOrder),              [initialOrder]);
  useEffect(() => setInternalData(initialInternalData), [initialInternalData]);
  useEffect(() => setBillingEntries(initialBillingEntries), [initialBillingEntries]);
  useEffect(() => setNotifications(initialNotifications), [initialNotifications]);
  useEffect(() => setTickets(initialTickets), [initialTickets]);

  const refresh = useCallback(() => router.refresh(), [router]);

  // Helpers for optimistic + server sync
  const addBillingEntryLocal = useCallback((entry: BillingEntry) => {
    setBillingEntries(prev => [entry, ...prev]);
  }, []);

  const removeBillingEntryLocal = useCallback((id: string) => {
    setBillingEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const addNotificationLocal = useCallback((notif: ClientNotification) => {
    setNotifications(prev => [notif, ...prev]);
  }, []);

  const updateNotificationLocal = useCallback((id: string, updates: Partial<ClientNotification>) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  // Status badge color
  const statusColors: Record<string, string> = {
    pending:    'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    formed:     'bg-emerald-100 text-emerald-800',
    cancelled:  'bg-red-100 text-red-700',
  };
  const statusColor = statusColors[order.status] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="space-y-0 font-inter">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-0 pb-0">
        {/* Back + order meta */}
        <div className="flex flex-col gap-4 px-1 pt-1 pb-4">
          <Link
            href="/admin/llc-registrations"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#34088f] transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to LLC Orders
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#34088f]/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-[#34088f]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 font-manrope leading-tight">
                  {order.llcName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-inter">
                    <Hash className="w-3 h-3" />{order.orderNumber}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-inter">
                    <Calendar className="w-3 h-3" />
                    {order.submittedAt
                      ? new Date(order.submittedAt).toLocaleDateString()
                      : new Date(order.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Status dropdown */}
            <div className="flex items-center gap-3">
              <StatusDropdown
                orderId={order.id}
                currentStatus={order.status as any}
                adminId={adminId}
              />
            </div>
          </div>
        </div>

        {/* ── Tab Nav ──────────────────────────────────────────── */}
        <nav className="flex gap-0 overflow-x-auto scrollbar-hide border-t border-gray-100">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors font-manrope flex-shrink-0 ${
                activeTab === key
                  ? 'border-[#34088f] text-[#34088f] bg-[#34088f]/3'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <div className="pt-6">
        {activeTab === 'overview' && (
          <OverviewTab order={order} internalData={internalData} />
        )}
        {activeTab === 'formation' && (
          <FormationDetailsTab
            order={order}
            internalData={internalData}
            packages={packages}
            adminId={adminId}
            onSaved={refresh}
          />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab
            orderId={order.id}
            adminId={adminId}
            documents={internalData?.documents ?? []}
            onChanged={refresh}
          />
        )}
        {activeTab === 'addons' && (
          <AddonsTab
            order={order}
            allAddons={allAddons}
            internalAddons={internalData?.internalAddons ?? []}
            adminId={adminId}
            onSaved={refresh}
          />
        )}
        {activeTab === 'members' && (
          <MembersTab
            order={order}
            adminId={adminId}
            onSaved={refresh}
          />
        )}
        {activeTab === 'billing' && (
          <BillingTab
            order={order}
            internalData={internalData}
            billingEntries={billingEntries}
            adminId={adminId}
            onEntryAdded={addBillingEntryLocal}
            onEntryRemoved={removeBillingEntryLocal}
            onBillingSaved={refresh}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsTab
            orderId={order.id}
            clientEmail={order.clientEmail}
            clientName={order.clientName ?? ''}
            adminId={adminId}
            notifications={notifications}
            tickets={tickets}
            onNotificationAdded={addNotificationLocal}
            onNotificationUpdated={updateNotificationLocal}
            onRefresh={refresh}
          />
        )}
      </div>
    </div>
  );
}
