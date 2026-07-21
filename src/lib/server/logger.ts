import { env } from '$env/dynamic/private';

/**
 * Tiny structured server-side logger.
 *
 * Goals:
 *  - one structured JSON line per event (level, message, timestamp, context)
 *    so Railway logs are grep-able and machine-parseable;
 *  - a provider-agnostic monitoring seam (see `captureException` below) so a
 *    real error monitor (Sentry, etc.) can be dropped in later WITHOUT touching
 *    every call site.
 *
 * This intentionally has ZERO external dependencies. Do not add an SDK here
 * until the monitoring provider is chosen — the seam below is where it goes.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

// Whether a monitoring provider is configured. When SENTRY_DSN (or any future
// provider DSN) is unset, forwarding is a no-op.
const MONITORING_DSN = env.SENTRY_DSN ?? '';
const MONITORING_ENABLED = MONITORING_DSN.length > 0;

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const line: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString()
  };

  if (context) {
    for (const [key, value] of Object.entries(context)) {
      line[key] = serialize(value);
    }
  }

  const serialized = JSON.stringify(line);

  // Route through the matching console method so log-level filtering in Railway
  // (and local dev) still works.
  if (level === 'error') console.error(serialized);
  else if (level === 'warn') console.warn(serialized);
  else console.log(serialized);
}

/**
 * Monitoring adapter seam.
 *
 * When a provider DSN is configured this forwards the error + context to the
 * monitor. Today it is a stub: it logs that it *would* have reported. When you
 * adopt Sentry, add the SDK and replace the stub body below with the real call.
 *
 * IMPORTANT: keep this the single forwarding point — `logger.error` and the
 * `handleError` hook both funnel through here.
 */
function captureException(error: unknown, context?: LogContext): void {
  if (!MONITORING_ENABLED) return;

  // TODO(observability): wire a real monitor here once a provider is chosen.
  //
  //   import * as Sentry from '@sentry/sveltekit';
  //   Sentry.captureException(error, { extra: context });
  //
  // Until then, make it visible that forwarding *would* have happened so we can
  // confirm the DSN plumbing in staging without the SDK installed.
  emit('warn', 'captureException (monitoring stub — no SDK installed)', {
    ...context,
    forwardedError: error
  });
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    emit('debug', message, context);
  },
  info(message: string, context?: LogContext): void {
    emit('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    emit('warn', message, context);
  },
  /**
   * Log an error line AND forward it to the monitoring seam (no-op unless a
   * provider DSN is configured). Pass the caught error as `context.error`.
   */
  error(message: string, context?: LogContext): void {
    emit('error', message, context);
    const err = context?.error ?? new Error(message);
    captureException(err, context);
  }
};
