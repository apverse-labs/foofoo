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

function nowISTTime(): string {
  // Adds 5.5hr offset so UTC methods give IST values
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatLine(e: LogEntry): string {
  const meta = e.meta ? ` ${JSON.stringify(e.meta)}` : '';
  return `[${e.ts}] [${e.level}] [${e.module}] ${e.message}${meta}`;
}

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
