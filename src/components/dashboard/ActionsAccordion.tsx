'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, AlertCircle, Upload, CreditCard, FileText,
  RotateCcw, Building2, Clock, ArrowRight, ChevronDown
} from 'lucide-react';
import type { CustomerActionRequired } from '@/types/dashboard';

function ActionTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    document_resubmission: { label: 'Document',   cls: 'bg-orange-50 text-orange-600 border border-orange-200', icon: Upload },
    invoice_payment:       { label: 'Payment',    cls: 'bg-rose-50 text-rose-600 border border-rose-200',       icon: CreditCard },
    compliance_task:       { label: 'Compliance', cls: 'bg-purple-50 text-purple-600 border border-purple-200', icon: FileText },
    renewal_payment:       { label: 'Renewal',    cls: 'bg-blue-50 text-blue-600 border border-blue-200',       icon: RotateCcw },
  };
  const config = map[type] ?? { label: type, cls: 'bg-gray-100 text-gray-600 border border-gray-200', icon: AlertCircle };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-manrope ${config.cls}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function ActionsAccordion({ actions }: { actions: CustomerActionRequired[] }) {
  const [open, setOpen] = useState(false);

  if (actions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      {/* Header — always visible, click to toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 hover:from-amber-100 hover:to-orange-100 transition-colors focus:outline-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-black text-gray-900 font-manrope">Actions Required</h2>
            <p className="text-xs text-gray-500 font-inter">
              {actions.length} item{actions.length > 1 ? 's' : ''} need your attention
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center font-manrope">
            {actions.length}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-amber-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="divide-y divide-gray-50">
          {actions.slice(0, 5).map((action) => (
            <div key={action.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <ActionTypeBadge type={action.type} />
                  {action.priority === 'high' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 uppercase tracking-wider">
                      <AlertCircle className="w-2.5 h-2.5" /> High Priority
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 font-inter">{action.title}</p>
                <p className="text-xs text-gray-500 font-inter mt-0.5 line-clamp-1">{action.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-gray-400 font-inter flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {action.llcName}
                  </span>
                  {action.dueDate && (
                    <span className="text-[10px] text-gray-400 font-inter flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Due {new Date(action.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/dashboard/llc/${action.llcId}?tab=${
                  action.type === 'document_resubmission' ? 'documents' :
                  action.type === 'invoice_payment'       ? 'billing' :
                  action.type === 'renewal_payment'       ? 'compliance' : 'overview'
                }` as any}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#34088f] text-white text-xs font-semibold hover:bg-[#2a0673] transition-colors font-inter"
              >
                Resolve
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
