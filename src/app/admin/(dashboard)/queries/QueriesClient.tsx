'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useRealtime } from '@/components/realtime/RealtimeProvider';
import {
  getTicketMessages, sendTicketMessage, updateTicketStatus, deleteTicket,
  type AdminTicket, type TicketMessage,
} from '@/lib/admin/actions/manageTickets';
import {
  Search, Send, Loader2, RefreshCw, MessageSquare, ArrowLeft, User, Lock, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  open:        'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-gray-100 text-gray-600',
  closed:      'bg-gray-200 text-gray-500',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-manrope ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ── Live chat panel for one ticket ──────────────────────────────────────────
function ChatPanel({ ticket, adminId, onStatusChanged, onDeleted }: {
  ticket: AdminTicket;
  adminId: string;
  onStatusChanged: (id: string, status: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = useRealtime();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const msgs = await getTicketMessages(ticket.id);
    setMessages(msgs);
    setLoading(false);
  }, [ticket.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchMessages(); }, [fetchMessages]);

  // Broadcast channel — RLS-independent, bidirectional with the customer side.
  useEffect(() => {
    const channel = supabase.channel(`ticket-${ticket.id}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => prev.some(m => m.id === payload.id) ? prev : [...prev, {
          id: payload.id, queryId: ticket.id, senderId: payload.senderId,
          senderName: payload.senderId === adminId ? 'You' : null,
          senderRole: payload.senderId === adminId ? 'administrator' : 'customer',
          content: payload.content, isInternal: !!payload.isInternal, createdAt: payload.createdAt,
        }]);
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [ticket.id, adminId, supabase]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    const wasInternal = isInternal;
    const res = await sendTicketMessage(ticket.id, input.trim(), wasInternal);
    setSending(false);
    if (res.success && res.message) {
      setMessages(prev => prev.some(m => m.id === res.message!.id) ? prev : [...prev, res.message!]);
      // Only broadcast non-internal messages to the customer
      if (!wasInternal) {
        channelRef.current?.send({
          type: 'broadcast', event: 'message',
          payload: {
            id: res.message.id, senderId: adminId,
            content: res.message.content, isInternal: false, createdAt: res.message.createdAt,
          },
        });
      }
      setInput('');
      toast.success(wasInternal ? 'Internal note added' : 'Message sent');
    } else {
      toast.error(res.error || 'Failed to send message');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const originalStatus = ticket.status;
    onStatusChanged(ticket.id, newStatus);
    const res = await updateTicketStatus(ticket.id, newStatus);
    if (res.success) {
      // Push the status change to the customer's thread live
      channelRef.current?.send({
        type: 'broadcast', event: 'status', payload: { status: newStatus },
      });
      toast.success(`Ticket status updated to ${newStatus.replace('_', ' ')}`);
    } else {
      // Revert optimistic update
      onStatusChanged(ticket.id, originalStatus);
      toast.error(res.error || 'Failed to update ticket status');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this ticket and all its messages? This cannot be undone.')) return;
    setDeleting(true);
    const res = await deleteTicket(ticket.id);
    setDeleting(false);
    if (res.success) {
      onDeleted(ticket.id);
      toast.success('Ticket deleted successfully');
    } else {
      toast.error(res.error || 'Failed to delete ticket');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 font-manrope truncate">{ticket.subject}</p>
          <p className="text-[11px] text-gray-400 font-inter flex items-center gap-1.5">
            <User className="w-3 h-3" /> {ticket.customerName || 'Customer'} · {ticket.customerEmail}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={ticket.status}
            onChange={e => handleStatusChange(e.target.value)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer ${STATUS_STYLES[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <button onClick={fetchMessages} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50" title="Delete ticket">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.isInternal ? 'bg-amber-50 border border-amber-200 text-amber-900'
                    : isAdmin ? 'bg-[#34088f] text-white' : 'bg-gray-100 text-gray-900'
                }`}>
                  {!isAdmin && msg.senderName && (
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-60">{msg.senderName}</p>
                  )}
                  {msg.isInternal && (
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Internal note</p>
                  )}
                  <p className="text-xs font-inter leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[9px] mt-1 ${isAdmin && !msg.isInternal ? 'text-white/60' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 cursor-pointer">
            <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="accent-[#34088f]" />
            <Lock className="w-3 h-3" /> Internal note (not visible to customer)
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            placeholder={isInternal ? 'Write an internal note…' : 'Type a reply…'}
            className="flex-1 h-10 px-4 bg-gray-50 border border-gray-200 rounded-full text-xs font-inter outline-none focus:border-[#34088f] focus:bg-white transition-all"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="w-10 h-10 flex items-center justify-center bg-[#34088f] text-white rounded-full hover:bg-[#2d077c] disabled:opacity-50 transition-all flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Master-detail container ─────────────────────────────────────────────────
export function QueriesClient({ initialTickets, adminId }: { initialTickets: AdminTicket[]; adminId: string }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(initialTickets[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (t.subject?.toLowerCase().includes(q) || t.customerName?.toLowerCase().includes(q) || t.customerEmail?.toLowerCase().includes(q));
    }
    return true;
  });

  const selected = tickets.find(t => t.id === selectedId) ?? null;

  const handleStatusChanged = (id: string, status: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const handleDeleted = (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    setSelectedId(prev => (prev === id ? null : prev));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: '640px' }}>
      {/* List */}
      <div className={`flex flex-col border-r border-gray-100 ${selected ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-3 border-b border-gray-100 space-y-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#34088f] outline-none font-inter"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors ${
                  statusFilter === f ? 'bg-[#34088f] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
              <MessageSquare className="w-8 h-8 mb-2" />
              <p className="text-xs font-inter">No tickets found.</p>
            </div>
          ) : (
            filtered.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-colors ${
                  selectedId === t.id ? 'bg-[#34088f]/5' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-900 font-manrope truncate">{t.customerName || 'Customer'}</p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-xs font-semibold text-gray-700 font-inter truncate">{t.subject}</p>
                {t.lastMessage && (
                  <p className="text-[11px] text-gray-400 font-inter truncate mt-0.5">{t.lastMessage}</p>
                )}
                <p className="text-[10px] text-gray-300 font-inter mt-1">
                  {new Date(t.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{t.messageCount} msg{t.messageCount !== 1 ? 's' : ''}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className={`${selected ? 'flex' : 'hidden lg:flex'} flex-col min-h-0`}>
        {selected ? (
          <>
            <button onClick={() => setSelectedId(null)} className="lg:hidden flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to tickets
            </button>
            <div className="flex-1 min-h-0">
              <ChatPanel ticket={selected} adminId={adminId} onStatusChanged={handleStatusChanged} onDeleted={handleDeleted} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="w-10 h-10 mb-3" />
            <p className="text-sm font-inter">Select a ticket to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
