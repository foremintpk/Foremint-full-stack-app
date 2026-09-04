/**
 * @file src/components/admin/BatchJobBanner.tsx
 * @description Floating progress banner for a running batch.
 *
 * Rendered by the admin layout, so it follows the operator across pages: a run
 * started on the EIN page stays visible and keeps reporting while they read an
 * order or change a setting.
 *
 * On completion it becomes the run report — what succeeded, what failed and
 * why — with a retry that re-runs only the failures.
 */

'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import { summarize, useBatchJob } from '@/context/batch-job-context';

export function BatchJobBanner(): React.JSX.Element | null {
  const { job, cancel, retryFailed, dismiss, isRunning } = useBatchJob();
  const [expanded, setExpanded] = useState(false);

  if (!job) return null;

  const s = summarize(job);
  const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
  const failedItems = job.items.filter((i) => i.status === 'failed');
  const current = job.items[job.cursor];

  return (
    // Bottom-left, clear of the page's own bottom-right action buttons.
    <div className="fixed bottom-4 left-4 lg:left-[17rem] z-50 w-[min(26rem,calc(100vw-2rem))] font-inter">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-3.5">
          <div className="mt-0.5 flex-shrink-0">
            {isRunning ? (
              <Loader2 className="w-4 h-4 text-[#34088f] animate-spin" />
            ) : s.failed > 0 ? (
              <AlertTriangle className="w-4 h-4 text-[#92400e]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#065f46]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 truncate">{job.title}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              {isRunning
                ? `${s.done} of ${s.total}${current?.label ? ` · ${current.label}` : ''}`
                : job.status === 'cancelled'
                  ? `Stopped — ${s.succeeded} done, ${s.failed} failed, ${s.cancelled} not run`
                  : `Finished — ${s.succeeded} succeeded${s.failed ? `, ${s.failed} failed` : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {(s.failed > 0 || s.cancelled > 0) && (
              <button
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? 'Hide details' : 'Show details'}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            )}
            {isRunning ? (
              <button
                onClick={cancel}
                className="px-2 py-1 text-[11px] font-semibold text-gray-600 hover:text-[#991b1b] rounded"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="h-1 w-full bg-gray-100">
          <div
            className={`h-full transition-[width] duration-300 ${
              s.failed > 0 && !isRunning ? 'bg-[#b45309]' : 'bg-[#34088f]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Failure report */}
        {expanded && (s.failed > 0 || s.cancelled > 0) && (
          <div className="max-h-56 overflow-y-auto border-t border-gray-100 divide-y divide-gray-50">
            {job.items
              .filter((i) => i.status === 'failed' || i.status === 'cancelled')
              .map((i) => (
                <div key={i.id} className="flex items-start gap-2 px-3.5 py-2">
                  <XCircle
                    className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                      i.status === 'failed' ? 'text-[#991b1b]' : 'text-gray-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-800 truncate">{i.label}</p>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      {i.status === 'cancelled' ? 'Not run — the batch was stopped.' : i.message}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Retry */}
        {!isRunning && (s.failed > 0 || s.cancelled > 0) && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-gray-100 bg-gray-50">
            <span className="text-[11px] text-gray-500">
              {failedItems.length > 0
                ? `${failedItems.length} failed${s.cancelled ? `, ${s.cancelled} not run` : ''}`
                : `${s.cancelled} not run`}
            </span>
            <button
              onClick={retryFailed}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] transition"
            >
              <RotateCcw className="w-3 h-3" />
              Retry {s.failed + s.cancelled}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
