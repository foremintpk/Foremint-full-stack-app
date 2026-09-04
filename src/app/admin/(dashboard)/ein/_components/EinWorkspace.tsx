/**
 * @file src/app/admin/(dashboard)/ein/_components/EinWorkspace.tsx
 * @description The EIN section shell: automation control bar, manual selection
 * table, live run progress, and the generated-document records table.
 *
 * 1. Server vs Client choice rationale: Client Component. The batch runs one
 *    order per request so the progress bar can advance and failures surface as
 *    they happen, which needs client-held state.
 * 2. Caching layer: None. Every fetch is `no-store` — a stale attempt number
 *    would mislabel a filed federal form.
 * 3. RBAC: The page above is administrator-gated; every route it calls re-checks.
 * 4. Revalidation: Records and orders are refetched after each run.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, Loader2, Play, RefreshCw, Settings2 } from 'lucide-react';
import type { Ss4OrderRow } from '@/lib/services/ss4/types';
import type { Ss4Stats } from '@/lib/services/ss4/records';
import type { Ss4Record } from '@/lib/services/ss4/records';
import type { Ss4SettingsPublic } from '@/lib/services/ss4/settings';
import AutomationBar from './AutomationBar';
import OrderSelectTable from './OrderSelectTable';
import BatchList, { type Ss4Batch } from './BatchList';
import TemplateManager from './TemplateManager';
import { useBatchJob, summarize } from '@/context/batch-job-context';

interface EinWorkspaceProps {
  initialOrders: Ss4OrderRow[];
  initialBatches: Ss4Batch[];
  initialStats: Ss4Stats;
  initialSettings: Ss4SettingsPublic;
  visionConfigured: boolean;
  visionModel: string;
}

export default function EinWorkspace({
  initialOrders,
  initialBatches,
  initialStats,
  initialSettings,
  visionConfigured,
  visionModel,
}: EinWorkspaceProps): React.JSX.Element {
  const [orders, setOrders] = useState(initialOrders);
  const [batches, setBatches] = useState<Ss4Batch[]>(initialBatches);
  const [stats, setStats] = useState(initialStats);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [instructions, setInstructions] = useState('');
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);

  // The run itself lives in the admin-layout provider, so leaving this page
  // does not stop it and returning shows it still going.
  const { job, isRunning, start } = useBatchJob();
  const run = summarize(job);
  const wasSs4Run = job?.kind === 'ss4';
  const [refreshing, setRefreshing] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [oRes, bRes] = await Promise.all([
        fetch('/api/admin/ss4/orders', { cache: 'no-store' }),
        fetch('/api/admin/ss4/batches', { cache: 'no-store' }),
      ]);
      if (oRes.ok) setOrders((await oRes.json()).rows ?? []);
      if (bRes.ok) {
        const data = await bRes.json();
        setBatches(data.batches ?? []);
        setStats(data.stats ?? stats);
      }
    } catch {
      setError('Could not refresh. Check your connection and try again.');
    } finally {
      setRefreshing(false);
    }
  }, [stats]);

  /**
   * Runs the selected orders one request at a time.
   *
   * Sequential on purpose: the vision gateway rate-limits, and a per-order
   * request is what keeps a 20-order book inside the function timeout while
   * letting the progress bar advance.
   */
  const startGeneration = useCallback(
    (targets: Ss4OrderRow[]) => {
      if (targets.length === 0) return;
      setError(null);

      const batchId = crypto.randomUUID();
      setLastBatchId(batchId);

      const started = start(
        'ss4',
        `Generating ${targets.length} SS-4 packet${targets.length === 1 ? '' : 's'}`,
        targets.map((o) => ({ id: o.orderNumber, label: `${o.orderNumber} · ${o.llcName || 'LLC'}` })),
        async (item) => {
          const res = await fetch('/api/admin/ss4/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumber: item.id, batchId, instructions }),
          });

          // A non-JSON body means the route itself fell over; report that
          // rather than a parse error the operator cannot act on.
          let data: Record<string, unknown>;
          try {
            data = await res.json();
          } catch {
            return { ok: false, message: `Server error (HTTP ${res.status}).`, retryable: true };
          }

          if (res.ok && data.status === 'passed') {
            return { ok: true, message: `Attempt ${data.attempt} — ${data.companyName ?? ''}`.trim() };
          }

          const message =
            (data.failureReason as string) ?? (data.error as string) ?? 'Generation failed.';
          // 4xx other than 429 means the input is wrong, so retrying is futile.
          const retryable = res.status === 429 || res.status >= 500 || !res.ok === false;
          return { ok: false, message, retryable };
        }
      );

      if (!started) {
        setError('Another batch is already running. Wait for it to finish, or stop it first.');
        return;
      }
      setSelected(new Set());
    },
    [instructions, start]
  );

  const downloadZip = useCallback(
    async (body: { batchId?: string; recordIds?: string[] }) => {
      setZipping(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/ss4/download-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Could not build the ZIP.');
          return;
        }

        const skipped = Number(res.headers.get('X-Ss4-Skipped') ?? 0);
        if (skipped > 0) {
          setError(`${skipped} document${skipped === 1 ? '' : 's'} could not be downloaded and ${skipped === 1 ? 'was' : 'were'} left out of the ZIP.`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ss4-packets-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        setError('Could not download the ZIP.');
      } finally {
        setZipping(false);
      }
    },
    []
  );

  // Pull fresh records when a generation run completes.
  const lastSeenJob = useRef<string | null>(null);
  useEffect(() => {
    if (!job || job.status === 'running' || !wasSs4Run) return;
    if (lastSeenJob.current === job.id) return;
    lastSeenJob.current = job.id;
    void refresh();
  }, [job, wasSs4Run, refresh]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected.has(o.orderNumber)),
    [orders, selected]
  );


  return (
    <div className="space-y-6 font-inter pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-black font-manrope">EIN</h1>
          <p className="text-xs font-semibold text-gray-500">
            {orders.length} order{orders.length === 1 ? '' : 's'} awaiting an EIN
            {stats.atCap > 0 && (
              <span className="text-[#9a3412]"> · {stats.atCap} at the 6-attempt cap</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Templates
          </button>
          <button
            onClick={refresh}
            disabled={refreshing || isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {!visionConfigured && (
        <div className="flex items-start gap-2.5 p-3.5 bg-[#fef3c7] border border-[#fde68a] rounded-lg">
          <AlertTriangle className="w-4 h-4 text-[#92400e] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#92400e] leading-relaxed">
            <span className="font-semibold">No vision provider configured.</span>{' '}
            Filings with a readable text layer still generate, but scanned Articles and the
            responsible-party ID check will fail per order. Add the API key below.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-[#fee2e2] border border-[#fecaca] rounded-lg">
          <AlertTriangle className="w-4 h-4 text-[#991b1b] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#991b1b] leading-relaxed">{error}</p>
        </div>
      )}

      <AutomationBar
        initialSettings={initialSettings}
        visionModel={visionModel}
        disabled={isRunning}
      />

      {showTemplates && <TemplateManager />}

      {/* Progress and the failure report live in the floating banner, which
          follows the operator across pages while a run is going. */}
      {!isRunning && wasSs4Run && lastBatchId && run.succeeded > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#f0fdf4] border border-[#a7f3d0] rounded-lg">
          <p className="text-xs text-[#065f46]">
            Last run finished — {run.succeeded} packet{run.succeeded === 1 ? '' : 's'} generated
            {run.failed > 0 && `, ${run.failed} failed`}.
          </p>
          <button
            onClick={() => downloadZip({ batchId: lastBatchId })}
            disabled={zipping}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] disabled:opacity-50 transition"
          >
            {zipping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download this run ({run.succeeded})
          </button>
        </div>
      )}

      {/* Generated documents, grouped by the run that produced them */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-900 font-manrope">Generated documents</h2>
          <p className="text-xs text-gray-500">
            {stats.passed} passed · {stats.failed} failed across {batches.length} run
            {batches.length === 1 ? '' : 's'}
          </p>
        </div>

        <BatchList
          batches={batches}
          onDownloadBatch={(batchId) => downloadZip({ batchId })}
          onDeleted={refresh}
          zipping={zipping}
        />
      </section>

      {/* Manual selection */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-900 font-manrope">
            Pending orders
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {selected.size} selected
            </span>
            <button
              onClick={() => startGeneration(selectedOrders)}
              disabled={isRunning || selected.size === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Play className="w-3.5 h-3.5" />
              Start Generation
            </button>
          </div>
        </div>

        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={isRunning}
          rows={2}
          placeholder="Optional run instructions — e.g. FM-01159 address: 5900 Balcones Drive # 32512, Austin, TX 78731"
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50 resize-y"
        />

        <OrderSelectTable
          orders={orders}
          selected={selected}
          onSelectionChange={setSelected}
          disabled={isRunning}
        />
      </section>
    </div>
  );
}
