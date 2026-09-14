/**
 * @file src/lib/utils/withTimeout.ts
 * @description Bounds a promise with a timeout so a stalled database or API call
 * cannot hold a serverless function open indefinitely.
 *
 * Context: during the Sep 14 incident, PostgREST request threads were killed by
 * Warp's timeout manager after queries queued behind a stalled API tier. The
 * database's own `statement_timeout` is 120s — far longer than any gateway will
 * wait — so an unbounded await can keep a function billing long after the
 * caller has given up. Wrapping calls here fails fast and predictably instead.
 *
 * Note this races the timeout against the promise; it does not cancel the
 * underlying request. The point is to bound how long *we* wait, so the caller
 * can move on rather than block.
 */

export class TimeoutError extends Error {
  readonly timeoutMs: number;
  readonly operation: string;

  constructor(operation: string, timeoutMs: number) {
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    this.operation = operation;
  }
}

/**
 * Resolve `promise`, or reject with {@link TimeoutError} once `timeoutMs` elapses.
 *
 * @param promise    The work to bound. A Supabase query builder is thenable, so
 *                   it can be passed directly.
 * @param timeoutMs  Budget in milliseconds.
 * @param operation  Label used in the error message and logs.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(operation, timeoutMs));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
