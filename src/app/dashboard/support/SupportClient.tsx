'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupportQuery, sendSupportMessage } from '@/lib/dashboard/actions';
import {
  MessageSquare, Plus, Send, Loader2, Clock, CheckCircle2,
  AlertCircle, XCircle, ChevronRight, ArrowLeft, User, Headphones
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open:        { label: 'Open',        cls: 'bg-emerald-100 text-emerald-700' },
    in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
    resolved:    { label: 'Resolved',    cls: 'bg-gray-100 text-gray-500' },
    closed:      { label: 'Closed',      cls: 'bg-gray-100 text-gray-400' },
  };
  const cfg = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-manrope ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

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

interface SupportQuery {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: any;
  messages: any[];
}

interface Props {
  userId: string;
  queries: SupportQuery[];
}

export default function SupportClient({ userId, queries }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const router = useRouter();

  const selected = queries.find(q => q.id === selectedId) || null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setShowNew(false);
    setMobileView('detail');
  };

  const handleCreated = (newId: string) => {
    setShowNew(false);
    setSelectedId(newId);
    setMobileView('detail');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-manrope">Support</h1>
          <p className="text-sm text-gray-500 mt-1 font-inter">
            {queries.length} ticket{queries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowNew(true); setSelectedId(null); setMobileView('detail'); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34088f] text-white text-xs font-semibold hover:bg-[#2a0673] transition-colors font-inter"
        >
          <Plus className="w-3.5 h-3.5" /> New Ticket
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <div className="flex h-full">
          {/* Left panel — Ticket list */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-100 flex-shrink-0 ${
            mobileView === 'detail' ? 'hidden md:block' : ''
          }`}>
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider font-manrope">Tickets</h3>
            </div>

            {queries.length === 0 ? (
              <div className="p-10 text-center">
                <Headphones className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-inter">No support tickets yet.</p>
                <p className="text-xs text-gray-400 font-inter mt-1">Create one to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {queries.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleSelect(q.id)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-gray-50/50 transition-colors ${
                      selectedId === q.id ? 'bg-[#34088f]/[0.03] border-l-2 border-[#34088f]' : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 font-manrope line-clamp-1">{q.subject}</p>
                      <StatusBadge status={q.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-gray-400 font-inter">{timeAgo(q.updatedAt)}</span>
                      <span className="text-[10px] text-gray-400 font-inter">•</span>
                      <span className="text-[10px] text-gray-400 font-inter">{q.messageCount} message{q.messageCount !== 1 ? 's' : ''}</span>
                    </div>
                    {q.lastMessage && (
                      <p className="text-xs text-gray-500 font-inter mt-1 line-clamp-1">{q.lastMessage.content}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel — Detail / New ticket */}
          <div className={`flex-1 flex flex-col ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Mobile back */}
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 hover:text-[#34088f] font-inter"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All Tickets
            </button>

            {showNew ? (
              <NewTicketForm userId={userId} onCreated={handleCreated} onCancel={() => { setShowNew(false); setMobileView('list'); }} />
            ) : selected ? (
              <ConversationThread query={selected} userId={userId} />
            ) : (
              <div className="flex-1 flex items-center justify-center p-10">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-inter">Select a ticket or create a new one.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Ticket Form ────────────────────────────────────────────────────────
function NewTicketForm({ userId, onCreated, onCancel }: {
  userId: string;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    startTransition(async () => {
      setError(null);
      const res = await createSupportQuery(userId, subject, message);
      if (res.success && res.queryId) {
        onCreated(res.queryId);
      } else {
        setError(res.error || 'Failed to create ticket');
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <h3 className="text-sm font-black text-gray-900 font-manrope mb-4">New Support Ticket</h3>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-inter flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-inter">Subject</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief description of your issue..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-inter bg-gray-50 focus:bg-white focus:border-[#34088f] focus:ring-1 focus:ring-[#34088f]/20 outline-none transition-all"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 font-inter">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..."
            rows={8}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-inter bg-gray-50 focus:bg-white focus:border-[#34088f] focus:ring-1 focus:ring-[#34088f]/20 outline-none transition-all resize-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={isPending || !subject.trim() || !message.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#34088f] text-white text-sm font-semibold hover:bg-[#2a0673] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit Ticket
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors font-inter"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Conversation Thread ────────────────────────────────────────────────────
function ConversationThread({ query, userId }: { query: SupportQuery; userId: string }) {
  const [newMsg, setNewMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [query.messages.length]);

  const handleSend = () => {
    if (!newMsg.trim()) return;
    startTransition(async () => {
      setError(null);
      const res = await sendSupportMessage(query.id, newMsg);
      if (res.success) {
        setNewMsg('');
        router.refresh();
      } else {
        setError(res.error || 'Failed to send message');
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Thread header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black text-gray-900 font-manrope truncate">{query.subject}</h3>
          <StatusBadge status={query.status} />
        </div>
        <p className="text-[10px] text-gray-400 font-inter mt-1">
          Created {new Date(query.createdAt).toLocaleDateString()} • {query.messageCount} messages
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[400px]">
        {query.messages.map((msg: any) => {
          const isMine = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isMine ? 'order-2' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm font-inter ${
                  isMine
                    ? 'bg-[#34088f] text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
                <p className={`text-[10px] mt-1 font-inter ${isMine ? 'text-right text-gray-400' : 'text-gray-400'}`}>
                  {isMine ? 'You' : 'Support'} • {timeAgo(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      {error && (
        <div className="px-6 py-2">
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-inter">{error}</div>
        </div>
      )}

      {query.status !== 'closed' && (
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-end gap-3">
            <textarea
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              placeholder="Type your reply..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-inter bg-gray-50 focus:bg-white focus:border-[#34088f] focus:ring-1 focus:ring-[#34088f]/20 outline-none transition-all resize-none"
            />
            <button
              onClick={handleSend}
              disabled={isPending || !newMsg.trim()}
              className="p-3 rounded-xl bg-[#34088f] text-white hover:bg-[#2a0673] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
