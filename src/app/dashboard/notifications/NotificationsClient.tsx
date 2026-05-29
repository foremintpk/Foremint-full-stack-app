'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CustomerNotification } from '@/types/dashboard';
import { markCustomerNotificationsRead } from '@/lib/dashboard/actions';
import {
  Bell, Check, CheckCheck, FileText, CreditCard, Shield,
  RotateCcw, Info, Clock, Filter
} from 'lucide-react';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const categoryConfig: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
  billing:    { icon: CreditCard, cls: 'bg-rose-50 text-rose-600',     label: 'Billing' },
  compliance: { icon: Shield,     cls: 'bg-purple-50 text-purple-600', label: 'Compliance' },
  renewal:    { icon: RotateCcw,  cls: 'bg-blue-50 text-blue-600',     label: 'Renewal' },
  document:   { icon: FileText,   cls: 'bg-orange-50 text-orange-600', label: 'Document' },
  general:    { icon: Info,       cls: 'bg-gray-50 text-gray-600',     label: 'General' },
};

type CategoryKey = 'all' | 'billing' | 'compliance' | 'renewal' | 'document' | 'general';

interface Props {
  notifications: CustomerNotification[];
  userId: string;
}

export default function NotificationsClient({ notifications, userId }: Props) {
  const [category, setCategory] = useState<CategoryKey>('all');
  const [isPending, startTransition] = useTransition();
  const [markedAll, setMarkedAll] = useState(false);
  const router = useRouter();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filtered = category === 'all'
    ? notifications
    : notifications.filter(n => n.category === category);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markCustomerNotificationsRead(userId);
      if (res.success) {
        setMarkedAll(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-manrope">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1 font-inter">
            {unreadCount > 0 && !markedAll ? `${unreadCount} unread` : 'All caught up'} • {notifications.length} total
          </p>
        </div>
        {unreadCount > 0 && !markedAll && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34088f] text-white text-xs font-semibold hover:bg-[#2a0673] transition-colors disabled:opacity-50 font-inter"
          >
            {isPending ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Mark All Read
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {(['all', 'billing', 'document', 'compliance', 'renewal', 'general'] as const).map((cat) => {
          const count = cat === 'all' ? notifications.length : notifications.filter(n => n.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap font-manrope ${
                category === cat
                  ? 'bg-[#34088f] text-white'
                  : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {cat === 'all' ? 'All' : categoryConfig[cat]?.label || cat}
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                category === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-inter">No notifications in this category.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((notif) => {
              const config = categoryConfig[notif.category] || categoryConfig.general;
              const Icon = config.icon;
              const isUnread = !notif.isRead && !markedAll;

              const content = (
                <div
                  className={`px-6 py-4 flex items-start gap-4 transition-colors ${
                    isUnread ? 'bg-[#34088f]/[0.02]' : ''
                  } hover:bg-gray-50/50`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.cls}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-inter ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notif.title}
                      </p>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#34088f] flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    {notif.body && (
                      <p className="text-xs text-gray-500 font-inter mt-0.5 line-clamp-2">{notif.body}</p>
                    )}
                    <p className="text-[10px] text-gray-400 font-inter mt-1.5">{timeAgo(notif.createdAt)}</p>
                  </div>
                </div>
              );

              if (notif.link) {
                // Remap admin links to client links if necessary
                const href = notif.link.startsWith('/admin') ? '/dashboard' : notif.link;
                return <Link key={notif.id} href={href as any}>{content}</Link>;
              }

              return <div key={notif.id}>{content}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
