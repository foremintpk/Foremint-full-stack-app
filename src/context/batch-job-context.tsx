/**
 * @file src/context/batch-job-context.tsx
 * @description A batch runner that survives page navigation.
 *
 * THE PROBLEM THIS SOLVES. Batch loops previously lived inside the EIN and
 * Documents page components. Navigating to another admin page unmounted the
 * component mid-run, and the loop died silently — an SS-4 batch stopped halfway
 * with no error and no record of where it got to.
 *
 * THE FIX. The provider is mounted once in the admin layout, which does not
 * unmount when the page beneath it changes, and the loop itself runs against a
 * ref rather than React state. Pages read progress from the context and can
 * come and go freely; the run continues either way.
 *
 * A run stops only when every item is done, or the operator cancels it. A
 * failing item is recorded and the loop moves on to the next one — one
 * unreadable filing must never cost the other nineteen.
 *
 * Not persisted across a full page reload: a browser refresh ends the run,
 * because the in-flight file handles and request state cannot be recovered.
 * The completed items keep their server-side records regardless.
 */

'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type JobKind = 'ss4' | 'documents' | 'extraction';

export type ItemStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface JobItem {
  id: string;
  /** What the operator sees — an order number, or a file name. */
  label: string;
  status: ItemStatus;
  /** Human-readable outcome; on failure, why it failed. */
  message?: string;
  /** Set when the failure is worth retrying (network, rate limit, timeout). */
  retryable?: boolean;
}

export interface BatchJob {
  id: string;
  kind: JobKind;
  title: string;
  items: JobItem[];
  status: 'running' | 'completed' | 'cancelled';
  startedAt: number;
  finishedAt?: number;
  /** Index of the item currently being processed. */
  cursor: number;
}

/**
 * Runs one item. Resolves with the outcome; a rejection is treated as a
 * non-retryable failure so a thrown error can never abort the whole loop.
 */
export type ItemRunner = (
  item: JobItem
) => Promise<{ ok: boolean; message: string; retryable?: boolean }>;

interface BatchJobContextValue {
  job: BatchJob | null;
  /** Starts a run. Refuses if one is already going, so two cannot interleave. */
  start: (
    kind: JobKind,
    title: string,
    items: { id: string; label: string }[],
    runner: ItemRunner
  ) => boolean;
  cancel: () => void;
  /** Re-runs only the failed items of the finished job. */
  retryFailed: () => boolean;
  /** Clears a finished job from the banner. */
  dismiss: () => void;
  isRunning: boolean;
}

const BatchJobContext = createContext<BatchJobContextValue | null>(null);

export function BatchJobProvider({ children }: { children: React.ReactNode }) {
  const [job, setJob] = useState<BatchJob | null>(null);

  // The loop reads these refs, not state, so it is unaffected by re-renders and
  // by the page component that started it unmounting.
  const runnerRef = useRef<ItemRunner | null>(null);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);

  /** Drives the queue. Never throws; a thrown runner error becomes a failure. */
  const drive = useCallback(async (initial: BatchJob, runner: ItemRunner) => {
    runningRef.current = true;
    cancelRef.current = false;
    runnerRef.current = runner;

    let current = initial;

    for (let i = 0; i < current.items.length; i++) {
      if (cancelRef.current) {
        // Everything not yet attempted is marked cancelled rather than left
        // "pending", so the final report is unambiguous.
        current = {
          ...current,
          status: 'cancelled',
          finishedAt: Date.now(),
          items: current.items.map((it, idx) =>
            idx >= i && it.status === 'pending' ? { ...it, status: 'cancelled' as const } : it
          ),
        };
        setJob(current);
        break;
      }

      // Skip anything already resolved (the case when retrying failures).
      if (current.items[i].status !== 'pending') continue;

      current = {
        ...current,
        cursor: i,
        items: current.items.map((it, idx) => (idx === i ? { ...it, status: 'running' as const } : it)),
      };
      setJob(current);

      let outcome: { ok: boolean; message: string; retryable?: boolean };
      try {
        outcome = await runner(current.items[i]);
      } catch (error) {
        outcome = {
          ok: false,
          message: error instanceof Error ? error.message : 'Unexpected error.',
          retryable: true,
        };
      }

      current = {
        ...current,
        items: current.items.map((it, idx) =>
          idx === i
            ? {
                ...it,
                status: outcome.ok ? ('succeeded' as const) : ('failed' as const),
                message: outcome.message,
                retryable: outcome.ok ? undefined : outcome.retryable !== false,
              }
            : it
        ),
      };
      setJob(current);
    }

    if (!cancelRef.current) {
      current = { ...current, status: 'completed', finishedAt: Date.now(), cursor: current.items.length };
      setJob(current);
    }

    runningRef.current = false;
  }, []);

  const start = useCallback(
    (kind: JobKind, title: string, items: { id: string; label: string }[], runner: ItemRunner) => {
      // One run at a time: two concurrent SS-4 batches could both claim the
      // same attempt number for an order.
      if (runningRef.current) return false;
      if (items.length === 0) return false;

      const fresh: BatchJob = {
        id: crypto.randomUUID(),
        kind,
        title,
        items: items.map((i) => ({ ...i, status: 'pending' as const })),
        status: 'running',
        startedAt: Date.now(),
        cursor: 0,
      };
      setJob(fresh);
      void drive(fresh, runner);
      return true;
    },
    [drive]
  );

  const cancel = useCallback(() => {
    // Takes effect before the next item; the one in flight is allowed to finish
    // so a half-written upload is never left behind.
    cancelRef.current = true;
  }, []);

  const retryFailed = useCallback(() => {
    if (runningRef.current) return false;
    const runner = runnerRef.current;
    if (!job || !runner) return false;

    const failed = job.items.filter((i) => i.status === 'failed' || i.status === 'cancelled');
    if (failed.length === 0) return false;

    const retryJob: BatchJob = {
      ...job,
      id: crypto.randomUUID(),
      status: 'running',
      startedAt: Date.now(),
      finishedAt: undefined,
      cursor: 0,
      // Successes are kept in the list so the report stays complete, but are
      // not re-run.
      items: job.items.map((i) =>
        i.status === 'failed' || i.status === 'cancelled'
          ? { ...i, status: 'pending' as const, message: undefined, retryable: undefined }
          : i
      ),
    };
    setJob(retryJob);
    void drive(retryJob, runner);
    return true;
  }, [job, drive]);

  const dismiss = useCallback(() => {
    if (runningRef.current) return;
    setJob(null);
    runnerRef.current = null;
  }, []);

  const value = useMemo(
    () => ({ job, start, cancel, retryFailed, dismiss, isRunning: job?.status === 'running' }),
    [job, start, cancel, retryFailed, dismiss]
  );

  return <BatchJobContext.Provider value={value}>{children}</BatchJobContext.Provider>;
}

export function useBatchJob(): BatchJobContextValue {
  const ctx = useContext(BatchJobContext);
  if (!ctx) throw new Error('useBatchJob must be used inside a BatchJobProvider');
  return ctx;
}

/** Counts by status, for progress display. */
export function summarize(job: BatchJob | null) {
  if (!job) return { total: 0, done: 0, succeeded: 0, failed: 0, cancelled: 0, pending: 0 };
  const by = (s: ItemStatus) => job.items.filter((i) => i.status === s).length;
  const succeeded = by('succeeded');
  const failed = by('failed');
  const cancelled = by('cancelled');
  return {
    total: job.items.length,
    done: succeeded + failed + cancelled,
    succeeded,
    failed,
    cancelled,
    pending: by('pending') + by('running'),
  };
}
