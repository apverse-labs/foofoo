/**
 * @summary Structured system logger for all modules. Replaces raw console.log throughout the app.
 *
 * @description
 * All console output in FooFoo must go through this logger.
 * In development: writes to console with ANSI colour coding.
 * In production: errors → Sentry captureException, warnings → Sentry breadcrumb; info/debug suppressed.
 * Persists last 500 entries to AsyncStorage for in-app debug view.
 *
 * Format: [HH:MM:SS IST] [LEVEL] [MODULE] message {meta}
 *
 * @calledBy All modules throughout the app — never use raw console.log
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

declare const __DEV__: boolean;

const STORAGE_KEY = 'foofoo_system_logs';
const MAX_ENTRIES = 500;

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  ts: string;
  level: LogLevel;
  module: string;
  message: string;
  meta?: object;
}

// ANSI colour codes for development console
const ANSI: Record<LogLevel, string> = {
  DEBUG: '\x1b[90m',
  INFO: '\x1b[37m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
};
const RESET = '\x1b[0m';

/**
 * @summary Returns the current time in IST as HH:MM:SS string.
 * @returns {string} Time formatted as 'HH:MM:SS' in IST
 */
function nowISTTime(): string {
  // Adds 5.5hr offset so UTC methods give IST values
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * @summary Formats a LogEntry into a single human-readable line.
 * @param {LogEntry} e - The log entry to format
 * @returns {string} Formatted line: '[HH:MM:SS] [LEVEL] [MODULE] message {meta}'
 */
function formatLine(e: LogEntry): string {
  const meta = e.meta ? ` ${JSON.stringify(e.meta)}` : '';
  return `[${e.ts}] [${e.level}] [${e.module}] ${e.message}${meta}`;
}

/**
 * @summary Appends a log entry to the AsyncStorage circular buffer (max 500 entries).
 * @param {LogEntry} entry - The entry to persist
 * @returns {Promise<void>}
 */
async function persist(entry: LogEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const entries: LogEntry[] = raw ? JSON.parse(raw) : [];
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Non-fatal — storage failures must not break the app
  }
}

/**
 * @summary Forwards ERROR entries to Sentry.captureException and WARN entries to Sentry breadcrumbs.
 * @param {LogLevel} level - Log level to determine Sentry action
 * @param {string} module - Module name for the Sentry context
 * @param {string} message - Log message
 * @param {object} [meta] - Optional metadata attached as Sentry extra/data
 */
function sendToSentry(level: LogLevel, module: string, message: string, meta?: object): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/react-native');
    if (level === 'ERROR') {
      Sentry.captureException(new Error(`[${module}] ${message}`), { extra: meta });
    } else if (level === 'WARN') {
      Sentry.addBreadcrumb({ message: `[${module}] ${message}`, level: 'warning', data: meta });
    }
  } catch {
    // Sentry not initialised yet — safe to ignore
  }
}

/**
 * @summary Core log dispatcher — formats, prints to console in dev, persists, and routes to Sentry in prod.
 * @param {LogLevel} level - Severity level
 * @param {string} module - SCREAMING_SNAKE_CASE module name (e.g. 'PLANS-REPO')
 * @param {string} message - Past-tense description of what happened
 * @param {object} [meta] - Structured metadata relevant to this event
 */
function log(level: LogLevel, module: string, message: string, meta?: object): void {
  if (level === 'DEBUG' && !__DEV__) return;

  const ts = nowISTTime();
  const entry: LogEntry = { ts, level, module, message, ...(meta ? { meta } : {}) };
  const line = formatLine(entry);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`${ANSI[level]}${line}${RESET}`);
  }

  persist(entry);

  if (!__DEV__ && (level === 'ERROR' || level === 'WARN')) {
    sendToSentry(level, module, message, meta);
  }
}

export const Logger = {
  /**
   * @summary Debug-level log — dev only, never sent to Sentry.
   * @calledBy Any module during development debugging
   */
  debug: (module: string, message: string, meta?: object): void =>
    log('DEBUG', module, message, meta),

  /**
   * @summary Info-level log — always persisted, never sent to Sentry.
   * @calledBy Significant app events (plan generation, navigation)
   */
  info: (module: string, message: string, meta?: object): void =>
    log('INFO', module, message, meta),

  /**
   * @summary Warning — persisted + Sentry breadcrumb in production.
   * @calledBy Recoverable errors (auth retries, fallback paths)
   */
  warn: (module: string, message: string, meta?: object): void =>
    log('WARN', module, message, meta),

  /**
   * @summary Error — persisted + Sentry captureException in production.
   * @calledBy All catch blocks for unexpected failures
   */
  error: (module: string, message: string, meta?: object): void =>
    log('ERROR', module, message, meta),

  /**
   * @summary Returns all stored log lines as formatted plain text.
   * @calledBy DevToolsScreen — System tab
   */
  async getLogs(): Promise<string> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const entries: LogEntry[] = raw ? JSON.parse(raw) : [];
      if (entries.length === 0) return '(no system logs yet)';
      return entries.map(formatLine).join('\n');
    } catch {
      return '(error reading system logs)';
    }
  },

  /**
   * @summary Clears all stored system logs.
   * @calledBy DevToolsScreen clear button
   */
  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal
    }
  },
};
