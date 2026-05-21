/**
 * @summary Writes human-readable user journey log entries to AsyncStorage per user.
 *
 * @description
 * Tracks every significant user action and app decision in plain English.
 * Each user gets their own circular log (max 200 entries) keyed by userId prefix.
 * Logs are retrievable via the DevToolsScreen.
 * Format: timestamped text blocks readable by both humans and AI for debugging.
 * Development and testing aid only — exists until production deployment.
 *
 * @calledBy All onboarding steps, RE scoring result, Home screen gesture handlers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_ENTRIES = 200;
const KEY_PREFIX = 'foofoo_journey_log_';

const DIVIDER_HEAVY = '═══════════════════════════════════════════════════════';
const DIVIDER_LIGHT = '───────────────────────────────────────────────────────';

type JourneyCategory = 'ONBOARDING' | 'PREFERENCE' | 'RE_DECISION' | 'GESTURE' | 'SYSTEM';

interface JourneyEntry {
  /** Stored as IST-shifted ISO string so getUTC* methods return IST values */
  ts: string;
  category: JourneyCategory;
  module: string;
  body: string;
}

/**
 * @summary Returns a Date whose UTC methods yield current IST values.
 * @returns {Date} Date shifted +5:30 so getUTC* calls return IST
 */
function nowIST(): Date {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000);
}

/**
 * @summary Formats a shifted IST Date as short timestamp: '21 May 9:30 AM'.
 * @param {Date} d - IST-shifted Date (from nowIST() or stored ISO string)
 * @returns {string} Human-readable short date-time in IST
 */
function formatIST(d: Date): string {
  const day = d.getUTCDate();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getUTCMonth()];
  const rawH = d.getUTCHours();
  const h = rawH % 12 || 12;
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = rawH >= 12 ? 'PM' : 'AM';
  return `${day} ${month} ${h}:${m} ${ampm}`;
}

/**
 * @summary Formats a shifted IST Date as full timestamp: '21 May 2026 9:30 AM IST'.
 * @param {Date} d - IST-shifted Date (from nowIST() or stored ISO string)
 * @returns {string} Human-readable full date-time with year and timezone label
 */
function formatISTFull(d: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = d.getUTCDate();
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const rawH = d.getUTCHours();
  const h = rawH % 12 || 12;
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = rawH >= 12 ? 'PM' : 'AM';
  return `${day} ${month} ${year} ${h}:${m} ${ampm} IST`;
}

/**
 * @summary Appends one JourneyEntry to the user's AsyncStorage circular log (max 200 entries).
 * @param {string} userId - User ID (first 8 chars used as storage key prefix)
 * @param {JourneyEntry} entry - The entry to append
 * @returns {Promise<void>}
 */
async function appendEntry(userId: string, entry: JourneyEntry): Promise<void> {
  try {
    const key = KEY_PREFIX + userId.slice(0, 8);
    const raw = await AsyncStorage.getItem(key);
    const entries: JourneyEntry[] = raw ? JSON.parse(raw) : [];
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    await AsyncStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Non-fatal — logging must never break the app
  }
}

export const UserJourneyLogger = {
  /**
   * @summary Logs an onboarding step completion with what the user chose.
   * @param userId - User ID (first 8 chars used as storage key)
   * @param step - Step number 1–7
   * @param stepName - Human-readable step name
   * @param choices - What the user chose at this step
   * @calledBy Each onboarding step on successful save
   */
  async logOnboardingStep(
    userId: string,
    step: number,
    stepName: string,
    choices: Record<string, unknown>,
  ): Promise<void> {
    const d = nowIST();
    const lines: string[] = [];
    for (const [key, val] of Object.entries(choices)) {
      if (val === null || val === undefined) continue;
      if (Array.isArray(val)) {
        lines.push(`${key}: ${val.join(', ') || '(none)'}`);
      } else {
        lines.push(`${key}: ${String(val)}`);
      }
    }
    await appendEntry(userId, {
      ts: d.toISOString(),
      category: 'ONBOARDING',
      module: `Step ${step}: ${stepName}`,
      body: lines.join('\n') || '(no choices recorded)',
    });
  },

  /**
   * @summary Logs the RE's meal decision with plain-English reasoning.
   * @param userId - User ID
   * @param mealSlot - breakfast/lunch/dinner
   * @param planDate - YYYY-MM-DD
   * @param winner - The dish that was chosen
   * @param alternatives - Top alternatives considered with scores
   * @param reasoning - Plain English explanation of the decision
   * @calledBy plans.repository.ts after generate-daily-plan returns
   */
  async logREDecision(
    userId: string,
    mealSlot: string,
    planDate: string,
    winner: { name: string; score: number; cuisine: string },
    alternatives: Array<{ dish_name: string; final_score: number; why_not_first: string }>,
    reasoning: string,
  ): Promise<void> {
    const d = nowIST();
    const slot = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1);
    const [year, mo, day] = planDate.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateLabel = `${parseInt(day)} ${months[parseInt(mo) - 1]} ${year}`;

    const altLines = alternatives
      .map((a, i) => `  ${i + 2}. ${a.dish_name.padEnd(16, ' ')} — Score: ${a.final_score.toFixed(2)} (${a.why_not_first})`)
      .join('\n');

    const body = [
      `App chose: ${winner.name.toUpperCase()} (Score: ${winner.score.toFixed(2)})`,
      '',
      reasoning,
      '',
      'Top alternatives the app considered:',
      altLines || '  (no alternatives scored)',
    ].join('\n');

    await appendEntry(userId, {
      ts: d.toISOString(),
      category: 'RE_DECISION',
      module: `${slot} — ${dateLabel}`,
      body,
    });
  },

  /**
   * @summary Logs a user gesture action on a meal card.
   * @param userId - User ID
   * @param action - accepted/rejected/never/not_today/locked/swiped
   * @param dishName - Name of the dish acted on
   * @param mealSlot - Which meal slot
   * @param positionInCarousel - Which position in the carousel (0-based)
   * @calledBy MealCard gesture handlers and home screen action handlers
   */
  async logGestureAction(
    userId: string,
    action: string,
    dishName: string,
    mealSlot: string,
    positionInCarousel: number,
  ): Promise<void> {
    const d = nowIST();
    const slot = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1);
    const pos = positionInCarousel + 1;

    const ACTION_TEXT: Record<string, string> = {
      swiped: `User swiped on ${slot} (${dishName} at position ${pos})\n→ Browsing carousel`,
      accepted: `User accepted ${dishName} for ${slot}`,
      never: [
        `User performed LONG PRESS + DRAG DOWN on ${dishName}`,
        `→ Action: NEVER`,
        `→ ${dishName} added to Never List`,
        `→ It will not appear in any future suggestion`,
      ].join('\n'),
      not_today: [
        `User performed LONG PRESS + DRAG UP on ${dishName}`,
        `→ Action: NOT TODAY`,
        `→ ${dishName} skipped for today only`,
      ].join('\n'),
      locked: [
        `User locked ${dishName} for ${slot}`,
        `→ This dish will not be replaced until unlocked`,
      ].join('\n'),
      unlocked: `User unlocked ${slot} — ${dishName} can now be replaced by RE`,
      tapped_detail: `User tapped ${dishName} to see full dish details`,
    };

    const body = ACTION_TEXT[action] ?? `User performed '${action}' on ${dishName} (position ${pos})`;

    await appendEntry(userId, {
      ts: d.toISOString(),
      category: 'GESTURE',
      module: 'Home Screen',
      body,
    });
  },

  /**
   * @summary Retrieves the full log for a user as formatted text.
   * @param userId - User ID
   * @returns Full log as a human-readable string
   * @calledBy DevToolsScreen — User Journey tab
   */
  async getFullLog(userId: string): Promise<string> {
    try {
      const key = KEY_PREFIX + userId.slice(0, 8);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return '(no journey log yet — complete onboarding or generate a plan)';
      const entries: JourneyEntry[] = JSON.parse(raw);
      if (entries.length === 0) return '(journey log is empty)';

      // ts was stored as IST-shifted ISO, so getUTC* gives IST values
      const startDate = formatISTFull(new Date(entries[0].ts));
      const shortId = `user_${userId.slice(0, 8)}`;

      const header = [
        DIVIDER_HEAVY,
        'FooFoo User Journey Log',
        `User: ${shortId} | Started: ${startDate}`,
        DIVIDER_HEAVY,
      ].join('\n');

      const blocks = entries.map(e => {
        const tsDate = new Date(e.ts);
        return [
          '',
          `[${formatIST(tsDate)}] | ${e.category} | ${e.module}`,
          DIVIDER_LIGHT,
          e.body,
          DIVIDER_HEAVY,
        ].join('\n');
      });

      return [header, ...blocks].join('\n');
    } catch {
      return '(error reading journey log)';
    }
  },

  /**
   * @summary Clears a user's journey log.
   * @param userId - User ID
   * @calledBy DevToolsScreen clear button
   */
  async clearLog(userId: string): Promise<void> {
    try {
      const key = KEY_PREFIX + userId.slice(0, 8);
      await AsyncStorage.removeItem(key);
    } catch {
      // Non-fatal
    }
  },
};
