/**
 * @summary Structured logger for FooFoo client-side code.
 *
 * @description
 * In production: forwards errors to Sentry, adds breadcrumbs for warn/info.
 * In development: formatted console output with emoji prefix.
 *
 * Privacy rule: NEVER log email, password, allergens[], excluded_ingredients,
 * or any column from user_diet_rules/profiles that identifies a user.
 * Log only: user_id (UUID), plan_date, slot names, counts, durations, error messages.
 *
 * CLIENT-SIDE ONLY — never import this in Edge Functions (they are Deno, not React Native).
 * Edge Functions use console.log which is captured by Supabase Edge Function logs.
 *
 * For the full-featured logger with AsyncStorage persistence and IST timestamps,
 * use src/utils/systemLogger.ts (Logger). This module is a lightweight alternative
 * that forwards directly to Sentry without AsyncStorage I/O, suited for hot paths.
 *
 * @example
 * import { logger } from '../lib/logger'
 * logger.info('plan_generated', { plan_date, slot_count }, 1234)
 * logger.warn('pool_small', { user_id, slot, pool_size })
 * logger.error('supabase_query_failed', { table, operation, message: err.message })
 */

declare const __DEV__: boolean;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function _log(level: LogLevel, event: string, context?: Record<string, unknown>, duration_ms?: number): void {
  if (__DEV__) {
    const prefix: Record<LogLevel, string> = { debug: '🔍', info: '✓', warn: '⚠', error: '✗' };
    const consoleFn = level === 'debug' ? 'log' : level;
    // eslint-disable-next-line no-console
    console[consoleFn](
      `${prefix[level]} [FooFoo/${level.toUpperCase()}] ${event}`,
      context ?? '',
      duration_ms != null ? `(${duration_ms}ms)` : ''
    );
  }

  try {
    // Dynamic require keeps Sentry off the critical boot path (it may not be
    // initialised yet) and avoids a hard import that would break Deno if this
    // file were accidentally imported in an Edge Function.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires
    const Sentry = (globalThis as any).require?.('@sentry/react-native') as {
      captureMessage: (msg: string, opts: object) => void;
      addBreadcrumb: (opts: object) => void;
    } | undefined;
    if (!Sentry) return;
    if (level === 'error') {
      Sentry.captureMessage(event, { level: 'error', extra: context });
    } else if (level === 'warn') {
      Sentry.addBreadcrumb({ message: event, data: context, level: 'warning' });
    } else {
      Sentry.addBreadcrumb({ message: event, data: context, level: 'info' });
    }
  } catch {
    // Sentry not initialised yet — safe to ignore
  }
}

export const logger = {
  /**
   * @summary Debug-level log — dev only, never sent to Sentry.
   * @param {string} event - snake_case event name (e.g. 'raw_response')
   * @param {Record<string, unknown>} [context] - Structured context (no PII)
   */
  debug: (event: string, context?: Record<string, unknown>): void =>
    _log('debug', event, context),

  /**
   * @summary Info-level log — significant app events forwarded to Sentry breadcrumbs.
   * @param {string} event - snake_case event name (e.g. 'plan_generated')
   * @param {Record<string, unknown>} [context] - Structured context (no PII)
   * @param {number} [duration_ms] - Optional duration in milliseconds
   */
  info: (event: string, context?: Record<string, unknown>, duration_ms?: number): void =>
    _log('info', event, context, duration_ms),

  /**
   * @summary Warning — Sentry breadcrumb in production.
   * @param {string} event - snake_case event name (e.g. 'pool_small')
   * @param {Record<string, unknown>} [context] - Structured context (no PII)
   */
  warn: (event: string, context?: Record<string, unknown>): void =>
    _log('warn', event, context),

  /**
   * @summary Error — Sentry captureMessage in production.
   * @param {string} event - snake_case event name (e.g. 'supabase_query_failed')
   * @param {Record<string, unknown>} [context] - Structured context (no PII)
   */
  error: (event: string, context?: Record<string, unknown>): void =>
    _log('error', event, context),
};
