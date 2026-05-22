#!/usr/bin/env node
/**
 * @summary Exports human-readable transaction logs for a given IST date.
 *
 * @description
 * Reads structured rows from Supabase (suggestion_logs, recommendation_debug_log,
 * notification_log, etl_jobs, app_events) for one IST day, and writes plain-English
 * transaction logs to disk in the format used by userJourneyLogger.ts.
 *
 * Outputs:
 *   logs/users/user_<8charuid>_<YYYY-MM-DD>.txt   ← per-user, daily rolling
 *   logs/system/platform_<YYYY-MM-DD>.txt         ← system-wide, daily rolling
 *
 * Usage:
 *   node scripts/export-txn-logs.mjs                          # today (IST)
 *   node scripts/export-txn-logs.mjs --date 2026-05-22        # specific day
 *   node scripts/export-txn-logs.mjs --dry-run                # use fixtures, no DB
 *
 * Required env (loaded from .env.local or process env):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (read-only access OK; service role only if RLS blocks)
 *
 * Safety:
 *   - Never writes raw emails, JWTs, or passwords. User UUIDs are truncated to 8 chars.
 *   - Never overwrites a file silently — appends if the file already exists for that day.
 */

import { mkdir, writeFile, appendFile, readFile, access } from 'node:fs/promises';
import { existsSync, constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const LOGS_ROOT = join(PROJECT_ROOT, 'logs');

const DIVIDER_HEAVY = '═══════════════════════════════════════════════════════';
const DIVIDER_LIGHT = '───────────────────────────────────────────────────────';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── CLI args ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, date: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--date') args.date = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/export-txn-logs.mjs [--date YYYY-MM-DD] [--dry-run]');
      process.exit(0);
    }
  }
  return args;
}

// ─── Time helpers (IST) ──────────────────────────────────────────────────────

function nowIstDateISO() {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function istWindowForDate(ymd) {
  // Convert 00:00 IST on ymd → UTC ISO, and 24h later.
  const [y, m, d] = ymd.split('-').map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - 5.5 * 60 * 60 * 1000;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;
  return { startIso: new Date(startUtcMs).toISOString(), endIso: new Date(endUtcMs).toISOString() };
}

function formatIstShort(isoUtc) {
  const d = new Date(new Date(isoUtc).getTime() + 5.5 * 60 * 60 * 1000);
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  const rawH = d.getUTCHours();
  const h = rawH % 12 || 12;
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = rawH >= 12 ? 'PM' : 'AM';
  return `${day} ${month} ${h}:${mm} ${ampm}`;
}

function formatIstFull(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// ─── Env loader (minimal .env.local parser) ──────────────────────────────────

async function loadEnvLocal() {
  const envPath = join(PROJECT_ROOT, '.env.local');
  if (!existsSync(envPath)) return;
  const raw = await readFile(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

// ─── Supabase client ─────────────────────────────────────────────────────────

async function getSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to .env.local for full read access, or use --dry-run.',
    );
  }
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── DB readers ──────────────────────────────────────────────────────────────

async function fetchUserEvents(sb, startIso, endIso) {
  const { data, error } = await sb
    .from('suggestion_logs')
    .select('user_id, created_at, action, dish_id, meal_slot, position, plan_date')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`suggestion_logs read: ${error.message}`);
  return data || [];
}

async function fetchReDecisions(sb, startIso, endIso) {
  const { data, error } = await sb
    .from('recommendation_debug_log')
    .select('user_id, created_at, meal_slot, plan_date, winner_dish_id, winner_score, alternatives, reasoning')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: true });
  if (error && error.code !== 'PGRST204') throw new Error(`recommendation_debug_log read: ${error.message}`);
  return data || [];
}

async function fetchNotificationLog(sb, startIso, endIso) {
  const { data, error } = await sb
    .from('notification_log')
    .select('user_id, created_at, status, channel, title')
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: true });
  if (error && error.code !== 'PGRST204') return [];
  return data || [];
}

async function fetchEtlJobs(sb, startIso, endIso) {
  const { data, error } = await sb
    .from('etl_jobs')
    .select('id, job_name, status, started_at, finished_at, processed_count, error_count, notes')
    .gte('started_at', startIso)
    .lt('started_at', endIso)
    .order('started_at', { ascending: true });
  if (error && error.code !== 'PGRST204') return [];
  return data || [];
}

async function fetchDishMap(sb, ids) {
  if (ids.length === 0) return new Map();
  const { data, error } = await sb.from('dishes').select('id, name').in('id', ids);
  if (error) return new Map();
  return new Map((data || []).map(r => [r.id, r.name]));
}

// ─── Action vocabulary (matches userJourneyLogger.ts) ────────────────────────

function describeGesture(action, dishName, slotPretty, position) {
  const pos = (position ?? 0) + 1;
  switch (action) {
    case 'swiped':
    case 'swiped_to':
    case 'swiped_past':
      return [
        `User swiped on ${slotPretty} (${dishName} at position ${pos})`,
        `→ Browsing carousel`,
      ].join('\n');
    case 'accepted':
      return `User accepted ${dishName} for ${slotPretty}`;
    case 'never':
      return [
        `User performed LONG PRESS + DRAG DOWN on ${dishName}`,
        `→ Action: NEVER`,
        `→ ${dishName} added to Never List`,
        `→ It will not appear in any future suggestion`,
      ].join('\n');
    case 'not_today':
      return [
        `User performed LONG PRESS + DRAG UP on ${dishName}`,
        `→ Action: NOT TODAY`,
        `→ ${dishName} skipped for today only`,
      ].join('\n');
    case 'locked':
      return [
        `User locked ${dishName} for ${slotPretty}`,
        `→ This dish will not be replaced until unlocked`,
      ].join('\n');
    case 'unlocked':
      return `User unlocked ${slotPretty} — ${dishName} can now be replaced by RE`;
    case 'tapped_detail':
      return `User tapped ${dishName} to see full dish details`;
    case 'viewed':
      return `User viewed ${slotPretty} (${dishName} at position ${pos})`;
    default:
      return `User performed '${action}' on ${dishName} (position ${pos})`;
  }
}

// ─── Block builders ──────────────────────────────────────────────────────────

function makeBlock(timeLabel, category, module, body) {
  return [
    '',
    `[${timeLabel}] | ${category} | ${module}`,
    DIVIDER_LIGHT,
    body,
    DIVIDER_HEAVY,
  ].join('\n');
}

function buildUserFile(shortId, ymd, gestureRows, reRows, notifRows, dishMap) {
  const header = [
    DIVIDER_HEAVY,
    'FooFoo User Transaction Log',
    `User: user_${shortId} | Date: ${formatIstFull(ymd)} IST`,
    DIVIDER_HEAVY,
  ].join('\n');

  const blocks = [];

  for (const r of reRows) {
    const slot = (r.meal_slot || '').replace(/^./, c => c.toUpperCase());
    const dishName = dishMap.get(r.winner_dish_id) || `Dish #${r.winner_dish_id}`;
    const alts = Array.isArray(r.alternatives) ? r.alternatives : [];
    const altLines = alts
      .slice(0, 3)
      .map((a, i) => {
        const nm = a.dish_name || (a.dish_id ? `Dish #${a.dish_id}` : 'Unknown');
        const sc = typeof a.final_score === 'number' ? a.final_score.toFixed(2) : 'n/a';
        const why = a.why_not_first || '';
        return `  ${i + 2}. ${nm.padEnd(18, ' ')} — Score: ${sc}${why ? ` (${why})` : ''}`;
      })
      .join('\n');
    const winnerScore = typeof r.winner_score === 'number' ? r.winner_score.toFixed(2) : 'n/a';
    const body = [
      `App chose: ${dishName.toUpperCase()} (Score: ${winnerScore})`,
      '',
      r.reasoning || '(no reasoning recorded)',
      '',
      'Top alternatives the app considered:',
      altLines || '  (no alternatives scored)',
    ].join('\n');
    blocks.push(makeBlock(formatIstShort(r.created_at), 'RE_DECISION', `${slot} — ${formatIstFull(r.plan_date || ymd)}`, body));
  }

  for (const r of gestureRows) {
    const slot = (r.meal_slot || 'meal').replace(/^./, c => c.toUpperCase());
    const dishName = dishMap.get(r.dish_id) || `Dish #${r.dish_id}`;
    const body = describeGesture(r.action, dishName, slot, r.position);
    blocks.push(makeBlock(formatIstShort(r.created_at), 'GESTURE', 'Home Screen', body));
  }

  for (const r of notifRows) {
    const body = [
      `Notification ${r.status === 'delivered' ? 'delivered to' : (r.status || 'sent for')} user`,
      `→ Channel: ${r.channel || 'push'}`,
      `→ Title: ${r.title || '(no title recorded)'}`,
    ].join('\n');
    blocks.push(makeBlock(formatIstShort(r.created_at), 'NOTIFICATION', 'Push', body));
  }

  if (blocks.length === 0) blocks.push(makeBlock('—', 'SYSTEM', 'No activity', 'No user events recorded for this date.'));

  return [header, ...blocks].join('\n') + '\n';
}

function buildPlatformFile(ymd, etlRows, summary) {
  const header = [
    DIVIDER_HEAVY,
    'FooFoo Platform Transaction Log',
    `Date: ${formatIstFull(ymd)} IST`,
    DIVIDER_HEAVY,
  ].join('\n');

  const summaryBlock = makeBlock(
    '—',
    'PLATFORM',
    'Daily summary',
    [
      `Active users today: ${summary.userCount}`,
      `RE decisions made: ${summary.reCount}`,
      `Gesture events: ${summary.gestureCount}`,
      `Notifications sent: ${summary.notifCount}`,
      `Batch jobs run: ${etlRows.length}`,
    ].join('\n'),
  );

  const etlBlocks = etlRows.map(r => {
    const startedShort = formatIstShort(r.started_at);
    const dur = r.finished_at
      ? `${Math.round((new Date(r.finished_at) - new Date(r.started_at)) / 1000)}s`
      : 'still running';
    const body = [
      `Job: ${r.job_name}`,
      `→ Status: ${r.status}`,
      `→ Processed: ${r.processed_count ?? 0} | Errors: ${r.error_count ?? 0}`,
      `→ Duration: ${dur}`,
      r.notes ? `→ Notes: ${r.notes}` : null,
    ].filter(Boolean).join('\n');
    return makeBlock(startedShort, 'BATCH_JOB', r.job_name || 'etl_job', body);
  });

  return [header, summaryBlock, ...etlBlocks].join('\n') + '\n';
}

// ─── File I/O ────────────────────────────────────────────────────────────────

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function writeOrAppend(filePath, content) {
  try {
    await access(filePath, constants.F_OK);
    await appendFile(filePath, '\n' + content, 'utf8');
    return 'appended';
  } catch {
    await writeFile(filePath, content, 'utf8');
    return 'created';
  }
}

// ─── Fixture data for --dry-run ──────────────────────────────────────────────

function dryRunFixtures(ymd) {
  const startMs = Date.UTC(...ymd.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v)));
  const at = (h, m) => new Date(startMs + (h - 5.5) * 3600000 + m * 60000).toISOString();
  return {
    gestures: [
      { user_id: '7b53646c-1fd4-423a-96fe-ef2bf70c46af', created_at: at(8, 12), action: 'viewed',  dish_id: 4,  meal_slot: 'breakfast', position: 0, plan_date: ymd },
      { user_id: '7b53646c-1fd4-423a-96fe-ef2bf70c46af', created_at: at(8, 14), action: 'locked',  dish_id: 4,  meal_slot: 'breakfast', position: 0, plan_date: ymd },
      { user_id: '7b53646c-1fd4-423a-96fe-ef2bf70c46af', created_at: at(13, 5), action: 'not_today', dish_id: 18, meal_slot: 'lunch',  position: 1, plan_date: ymd },
    ],
    re: [
      {
        user_id: '7b53646c-1fd4-423a-96fe-ef2bf70c46af',
        created_at: at(5, 2),
        meal_slot: 'breakfast',
        plan_date: ymd,
        winner_dish_id: 4,
        winner_score: 1.42,
        alternatives: [
          { dish_id: 3, dish_name: 'Upma', final_score: 1.31, why_not_first: 'lower cuisine boost' },
          { dish_id: 7, dish_name: 'Poha', final_score: 1.18, why_not_first: 'seen 2 days ago' },
        ],
        reasoning: 'Idli Sambar wins because the user is from Tamil Nadu (regional +0.20), South Indian cuisine is Frequently bucket (+0.30), and the dish has not been shown in the last 3 days. Lower-ranked items lost points on either cuisine boost or variety guard.',
      },
    ],
    notifs: [
      { user_id: '7b53646c-1fd4-423a-96fe-ef2bf70c46af', created_at: at(7, 0), status: 'delivered', channel: 'push', title: 'Today’s plan is ready 🍳' },
    ],
    etl: [
      { id: 1, job_name: 'generate-daily-plans-batch', status: 'success', started_at: at(5, 0), finished_at: at(5, 3), processed_count: 3, error_count: 0, notes: '5AM IST CRON' },
      { id: 2, job_name: 'send-morning-notification',  status: 'success', started_at: at(7, 0), finished_at: at(7, 0), processed_count: 3, error_count: 0, notes: null },
    ],
    dishMap: new Map([[4, 'Idli Sambar'], [18, 'Paneer Butter Masala'], [3, 'Upma'], [7, 'Poha']]),
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);
  const ymd = args.date || nowIstDateISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    console.error(`Invalid --date '${ymd}'. Expected YYYY-MM-DD.`);
    process.exit(2);
  }

  let gestures, reDecisions, notifs, etl, dishMap;

  if (args.dryRun) {
    console.log(`[txn-export] --dry-run: using in-memory fixtures for ${ymd}`);
    const f = dryRunFixtures(ymd);
    gestures = f.gestures; reDecisions = f.re; notifs = f.notifs; etl = f.etl; dishMap = f.dishMap;
  } else {
    await loadEnvLocal();
    const sb = await getSupabase();
    const { startIso, endIso } = istWindowForDate(ymd);
    console.log(`[txn-export] fetching events for IST ${ymd} (${startIso} → ${endIso})…`);
    [gestures, reDecisions, notifs, etl] = await Promise.all([
      fetchUserEvents(sb, startIso, endIso),
      fetchReDecisions(sb, startIso, endIso),
      fetchNotificationLog(sb, startIso, endIso),
      fetchEtlJobs(sb, startIso, endIso),
    ]);
    const dishIds = new Set();
    for (const r of gestures) if (r.dish_id != null) dishIds.add(r.dish_id);
    for (const r of reDecisions) if (r.winner_dish_id != null) dishIds.add(r.winner_dish_id);
    dishMap = await fetchDishMap(sb, [...dishIds]);
  }

  // Group user events by user
  const byUser = new Map();
  const pushUser = (uid, key, row) => {
    if (!uid) return;
    const short = uid.slice(0, 8);
    if (!byUser.has(short)) byUser.set(short, { gestures: [], re: [], notifs: [] });
    byUser.get(short)[key].push(row);
  };
  for (const r of gestures) pushUser(r.user_id, 'gestures', r);
  for (const r of reDecisions) pushUser(r.user_id, 're', r);
  for (const r of notifs) pushUser(r.user_id, 'notifs', r);

  // Write per-user files
  const usersDir = join(LOGS_ROOT, 'users');
  const systemDir = join(LOGS_ROOT, 'system');
  await ensureDir(usersDir);
  await ensureDir(systemDir);

  let userFilesWritten = 0;
  for (const [short, rows] of byUser) {
    const content = buildUserFile(short, ymd, rows.gestures, rows.re, rows.notifs, dishMap);
    const filePath = join(usersDir, `user_${short}_${ymd}.txt`);
    const action = await writeOrAppend(filePath, content);
    console.log(`[txn-export] ${action.padEnd(8)} ${filePath}`);
    userFilesWritten++;
  }

  // Platform file
  const summary = {
    userCount: byUser.size,
    reCount: reDecisions.length,
    gestureCount: gestures.length,
    notifCount: notifs.length,
  };
  const platformContent = buildPlatformFile(ymd, etl, summary);
  const platformPath = join(systemDir, `platform_${ymd}.txt`);
  const pAction = await writeOrAppend(platformPath, platformContent);
  console.log(`[txn-export] ${pAction.padEnd(8)} ${platformPath}`);

  console.log(`[txn-export] done — ${userFilesWritten} user file(s) + 1 platform file for ${ymd}`);
}

main().catch(err => {
  console.error('[txn-export] FAILED:', err.message);
  process.exit(1);
});
