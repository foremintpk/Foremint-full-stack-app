'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, Plus, Send, Loader2, X, Save, MessageSquare,
  CheckCircle2, Clock, ChevronRight, ArrowLeft, RefreshCw,
} from 'lucide-react';
import {
  createClientNotification, toggleClientNotificationStatus,
  type ClientNotification, type NotificationCategory,
} from '@/lib/admin/actions/manageClientNotifications';
import {
  getTicketMessages, sendTicketMessage, updateTicketStatus,
  type OrderTicket, type TicketMessage,
} from '@/lib/admin/actions/manageTickets';
import { createClient } from '@/lib/supabase/client';

interface NotificationsTabProps {
  orderId: string;
  clientEmail: string;
  clientName: string;
  adminId: string;
  notifications: ClientNotification[];
  tickets: OrderTicket[];
  onNotificationAdded: (n: ClientNotification) => void;
  onNotificationUpdated: (id: string, u: Partial<ClientNotification>) => void;
  onRefresh: () => void;
}

// ─── Notification form ───────────────────────────────────────────────────────

function NotificationForm({
  orderId, adminId, clientEmail, clientName,
  onCreated, onCancel,
}: {
  orderId: string; adminId: string; clientEmail: string; clientName: string;
  onCreated: (n: ClientNotification) => void; onCancel: () => void;
}) {
  const [category, setCategory] = useState<NotificationCategory>('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [sendEmail, setSendEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (sendEmail && (!emailSubject.trim() || !emailBody.trim())) {
      setError('Email subject and body are required when Send Email is enabled'); return;
    }
    setSaving(true); setError(null);
    const res = await createClientNotification({
      orderId, adminId, category, title: title.trim(), body: body.trim() || undefined,
      status, sendEmail, emailSubject: emailSubject.trim() || undefined,
      emailBody: emailBody.trim() || undefined, clientEmail, clientName,
    });
    setSaving(false);
    if (res.success && res.notification) onCreated(res.notification);
    else setError(res.error ?? 'Failed to create notification');
  };

  const INPUT_CLS = 'block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all';
  const SELECT_CLS = 'block w-full h-10 pl-4 pr-10 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all appearance-none';
  const TEXTAREA_CLS = 'block w-full px-4 py-3 bg-white border border-[#e5e7eb] rounded-xl text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all resize-none';

  return (
    <div className="bg-white rounded-2xl border border-[#34088f]/20 shadow-sm p-5 mb-4">
      <p className="text-sm font-black text-gray-900 font-manrope mb-4">New Notification</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Category</label>
          <div className="relative"><select className={SELECT_CLS} value={category} onChange={e => setCategory(e.target.value as NotificationCategory)}>
            <option value="general">General</option>
            <option value="billing">Billing</option>
            <option value="documents">Documents</option>
            <option value="addons">Add-ons</option>
          </select></div>
        </div>
        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Status</label>
          <div className="relative"><select className={SELECT_CLS} value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select></div>
        </div>
        <div className="sm:col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Title *</label>
          <input className={INPUT_CLS} value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" /></div>
        <div className="sm:col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Body</label>
          <textarea className={TEXTAREA_CLS} rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="Optional notification body text" /></div>
      </div>

      {/* Send Email toggle */}
      <label className="flex items-center gap-3 cursor-pointer mb-3">
        <div className={`relative w-9 h-5 rounded-full transition-colors ${sendEmail ? 'bg-[#34088f]' : 'bg-gray-300'}`}
          onClick={() => setSendEmail(v => !v)}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${sendEmail ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-xs font-semibold text-gray-700 font-inter">Send Email to Client</span>
      </label>

      {sendEmail && (
        <div className="space-y-3 mb-3 pl-4 border-l-2 border-[#34088f]/20">
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Email Subject</label>
            <input className={INPUT_CLS} value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject line" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Email Body</label>
            <textarea className={TEXTAREA_CLS} rows={4} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Email message body..." /></div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-semibold mb-3 font-inter">{error}</p>}
      <div className="flex items-center gap-2">
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send Notification
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope">Cancel</button>
      </div>
    </div>
  );
}

// ─── Ticket chat ─────────────────────────────────────────────────────────────

function TicketChat({ ticket, adminId, onClose }: { ticket: OrderTicket; adminId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchMessages = useCallback(async () => {
    const msgs = await getTicketMessages(ticket.id);
    setMessages(msgs);
    setLoading(false);
  }, [ticket.id]);

  useEffect(() => { void fetchMessages(); }, [fetchMessages]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ticket:${ticket.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'query_messages',
        filter: `query_id=eq.${ticket.id}`,
      }, (payload) => {
        const d = payload.new as any;
        const newMsg: TicketMessage = {
          id: d.id, queryId: d.query_id, senderId: d.sender_id,
          senderName: null, senderRole: 'customer',
          content: d.content, isInternal: d.is_internal ?? false,
          createdAt: d.created_at,
        };
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticket.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    const res = await sendTicketMessage(ticket.id, input.trim());
    setSending(false);
    if (res.success && res.message) {
      setMessages(prev => [...prev, res.message!]);
      setInput('');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    await updateTicketStatus(ticket.id, newStatus);
    setUpdatingStatus(false);
  };

  const statusStyles: Record<string, string> = {
    open:        'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved:    'bg-gray-100 text-gray-600',
    closed:      'bg-gray-200 text-gray-500',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ height: '520px' }}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs font-bold text-gray-900 font-manrope">{ticket.subject}</p>
            <p className="text-[10px] text-gray-400 font-inter">{ticket.messageCount} messages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            defaultValue={ticket.status}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
            className={`text-[10px] font-bold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${statusStyles[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button onClick={fetchMessages} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-[#34088f]" /></div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400 font-inter">No messages yet</div>
        ) : (
          messages.map(msg => {
            const isAdmin = msg.senderRole === 'administrator' || msg.senderRole === 'manager';
            return (
              <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isAdmin ? 'bg-[#34088f] text-white' : 'bg-gray-100 text-gray-900'}`}>
                  {!isAdmin && msg.senderName && (
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-60">{msg.senderName}</p>
                  )}
                  <p className="text-xs font-inter leading-relaxed">{msg.content}</p>
                  <p className={`text-[9px] mt-1 ${isAdmin ? 'text-white/60' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
          placeholder="Type a message…"
          className="flex-1 h-10 px-4 bg-gray-50 border border-gray-200 rounded-full text-xs font-inter outline-none focus:border-[#34088f] focus:bg-white transition-all"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="w-10 h-10 flex items-center justify-center bg-[#34088f] text-white rounded-full hover:bg-[#2d077c] disabled:opacity-50 transition-all"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function NotificationsTab({
  orderId, clientEmail, clientName, adminId,
  notifications, tickets,
  onNotificationAdded, onNotificationUpdated, onRefresh,
}: NotificationsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [activeTicket, setActiveTicket] = useState<OrderTicket | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = async (n: ClientNotification) => {
    const newStatus: 'active' | 'inactive' = n.status === 'active' ? 'inactive' : 'active';
    setTogglingId(n.id);
    onNotificationUpdated(n.id, { status: newStatus });
    await toggleClientNotificationStatus(n.id, newStatus, orderId, clientEmail, clientName);
    setTogglingId(null);
  };

  const categoryStyles: Record<string, string> = {
    billing:   'bg-blue-100 text-blue-700',
    documents: 'bg-purple-100 text-purple-700',
    general:   'bg-gray-100 text-gray-600',
    addons:    'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-6">
      {activeTicket ? (
        <TicketChat ticket={activeTicket} adminId={adminId} onClose={() => setActiveTicket(null)} />
      ) : (
        <>
          {/* ── Notifications Section ──────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-gray-900 font-manrope">Client Notifications</h3>
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] transition-all font-manrope">
                <Plus className="w-3.5 h-3.5" /> Add New Notification
              </button>
            </div>

            {showForm && (
              <NotificationForm
                orderId={orderId} adminId={adminId} clientEmail={clientEmail} clientName={clientName}
                onCreated={n => { onNotificationAdded(n); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
            )}

            {notifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-inter bg-white rounded-2xl border border-gray-100">
                No notifications sent yet.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bell className="w-3.5 h-3.5 text-[#34088f]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-xs font-bold text-gray-900 font-manrope">{n.title}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${categoryStyles[n.category] ?? 'bg-gray-100 text-gray-600'}`}>
                              {n.category}
                            </span>
                            {n.sendEmail && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#34088f] font-inter">
                                Email sent
                              </span>
                            )}
                          </div>
                          {n.body && <p className="text-[11px] text-gray-500 font-inter leading-relaxed">{n.body}</p>}
                          <p className="text-[9px] text-gray-400 font-inter mt-1">
                            {new Date(n.createdAt).toLocaleDateString()}
                            {n.expiresAt && ` · Expires ${new Date(n.expiresAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle(n)}
                        disabled={togglingId === n.id}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all flex-shrink-0 ${
                          n.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {togglingId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : n.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {n.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Tickets Section ───────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-gray-900 font-manrope">Support Tickets</h3>
              <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400 font-inter bg-white rounded-2xl border border-gray-100">
                No support tickets from this client yet.
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map(ticket => {
                  const statusStyle = {
                    open:        'bg-emerald-100 text-emerald-700',
                    in_progress: 'bg-blue-100 text-blue-700',
                    resolved:    'bg-gray-100 text-gray-600',
                    closed:      'bg-gray-200 text-gray-500',
                  }[ticket.status] ?? 'bg-gray-100 text-gray-600';

                  return (
                    <button key={ticket.id} onClick={() => setActiveTicket(ticket)}
                      className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-left hover:border-[#c4b5fd] hover:shadow-md transition-all">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-[#34088f]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 font-manrope truncate">{ticket.subject}</p>
                            <p className="text-[10px] text-gray-400 font-inter">
                              {ticket.messageCount} messages · {new Date(ticket.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusStyle}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
