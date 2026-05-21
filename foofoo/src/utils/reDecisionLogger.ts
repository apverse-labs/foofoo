/**
 * @summary Reads RE scoring debug logs from recommendation_debug_log table for dev display.
 *
 * @description
 * Provides the formatted log string for the DevToolsScreen RE Decisions tab.
 * The actual writes happen inside the generate-daily-plan Edge Function
 * (which calls log-re-decision). This utility reads and formats those rows.
 *
 * @calledBy DevToolsScreen — RE Decisions tab
 */

import { supabase } from '../services/supabase';

const DIVIDER_HEAVY = '═══════════════════════════════════════════════════════';
const DIVIDER_LIGHT = '───────────────────────────────────────────────────────';

/**
 * @summary Formats a UTC ISO string as a human-readable IST date-time.
 * @param {string} isoStr - UTC ISO string from Supabase created_at
 * @returns {string} Locale-formatted date-time in Asia/Kolkata timezone
 */
function formatIST(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

export const REDecisionLogger = {
  /**
   * @summary Fetches and formats recent RE decision logs from Supabase.
   *
   * @param {number} [limit=30] - Maximum number of rows to fetch
   * @returns {Promise<string>} Formatted multi-line string suitable for monospace display
   *
   * @throws Never — errors are caught and returned as a human-readable error string
   *
   * @calledBy DevToolsScreen — RE Decisions tab
   */
  async getRecentLogs(limit = 30): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('recommendation_debug_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!data || data.length === 0) {
        return '(no RE decision logs yet — generate a plan first)';
      }

      const blocks = data.map(row => {
        const sb = row.score_breakdown ?? {};
        const winner = sb.winner ?? {};
        const alts: any[] = sb.alternatives ?? [];
        const ctx = sb.context ?? {};
        const ts = row.created_at ? formatIST(row.created_at) : 'unknown';
        const slot = (row.meal_slot ?? 'unknown').toUpperCase();

        const compLines = winner.components
          ? Object.entries(winner.components as Record<string, number>)
              .map(([k, v]) => `    ${k.padEnd(22)}: ${v}`)
              .join('\n')
          : '';

        const altLines = alts
          .map((a, i) =>
            `  ${i + 2}. ${String(a.dish_name ?? '').padEnd(18)} Score: ${
              typeof a.final_score === 'number' ? a.final_score.toFixed(2) : '?'
            } | ${a.why_not_first ?? ''}`
          )
          .join('\n');

        const ctxLine = ctx.total_eligible_dishes !== undefined
          ? `Pool: ${ctx.total_eligible_dishes} total → ${ctx.hard_filtered_out ?? 0} filtered → ${ctx.dish_pool_size ?? '?'} eligible`
          : '';
        const weatherLine = ctx.weather
          ? `Weather: ${ctx.weather.city} ${ctx.weather.temp}°C ${ctx.weather.condition}`
          : '';

        const lines = [
          '',
          `[${ts}] | RE_DECISION | ${slot} — ${row.plan_date ?? ''}`,
          DIVIDER_LIGHT,
          `Winner: ${winner.dish_name ?? 'unknown'}  Score: ${
            typeof winner.final_score === 'number' ? winner.final_score.toFixed(2) : '?'
          }`,
          compLines ? `Score components:\n${compLines}` : '',
          altLines ? `Alternatives:\n${altLines}` : '',
          ctxLine,
          weatherLine,
          `RE version: ${sb.re_version ?? 'v1'}  |  Generated in: ${sb.generation_time_ms ?? '?'}ms`,
          DIVIDER_HEAVY,
        ].filter(Boolean).join('\n');

        return lines;
      });

      return [
        DIVIDER_HEAVY,
        'FooFoo RE Decision Log',
        `Last ${data.length} decisions (most recent first)`,
        DIVIDER_HEAVY,
        ...blocks,
      ].join('\n');
    } catch (err: any) {
      return `(error reading RE logs: ${err?.message ?? 'unknown'})`;
    }
  },
};
