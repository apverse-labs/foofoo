/**
 * Custom Playwright QA Reporter
 *
 * Generates two output files after every test run:
 *   1. foofoo-tests/reports/e2e/qa-summary.md   — Markdown report for GitHub summaries
 *   2. foofoo-tests/reports/e2e/qa-report.html  — Standalone HTML report with inline CSS
 *
 * Implements the Playwright `Reporter` interface — registered in playwright.config.ts.
 *
 * Design:
 *   - onBegin: capture start time + total test count
 *   - onTestEnd: accumulate per-suite and per-test results (including attachments)
 *   - onEnd: write both files synchronously using Node `fs`
 */

import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestRecord {
  id: string;           // TC001-001
  suiteName: string;    // TC001 | Authentication
  title: string;        // Sign In | Renders sign-in screen…
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  durationMs: number;
  error?: string;
  screenshotPath?: string;
  screenshotBase64?: string;
  retries: number;
  projectName: string;
}

interface SuiteRecord {
  name: string;
  tests: TestRecord[];
}

// ─── Helper: extract TC ID from test title ────────────────────────────────────

function extractTcId(title: string): string {
  const match = title.match(/TC\d{3}-\d{3}/);
  return match ? match[0] : '—';
}

function extractSuiteName(title: string): string {
  const match = title.match(/TC\d{3} \|[^|]+/);
  return match ? match[0].trim() : 'General';
}

function extractTestTitle(title: string): string {
  // Remove the "TC001-001 | Category | " prefix to get the description
  const parts = title.split(' | ');
  return parts.length >= 3 ? parts.slice(2).join(' | ') : title;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusEmoji(status: TestRecord['status']): string {
  switch (status) {
    case 'passed':      return '✅ PASS';
    case 'failed':      return '❌ FAIL';
    case 'timedOut':    return '⏱️ TIMEOUT';
    case 'skipped':     return '⏭️ SKIP';
    case 'interrupted': return '⚠️ INTERRUPTED';
    default:            return '❓ UNKNOWN';
  }
}

function statusBadge(status: TestRecord['status']): string {
  const colors: Record<string, string> = {
    passed:      '#22c55e',
    failed:      '#ef4444',
    timedOut:    '#f97316',
    skipped:     '#a3a3a3',
    interrupted: '#eab308',
  };
  const labels: Record<string, string> = {
    passed:      'PASS',
    failed:      'FAIL',
    timedOut:    'TIMEOUT',
    skipped:     'SKIP',
    interrupted: 'INTERRUPTED',
  };
  const color = colors[status] ?? '#a3a3a3';
  const label = labels[status] ?? 'UNKNOWN';
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;font-family:monospace">${label}</span>`;
}

// ─── Reporter class ───────────────────────────────────────────────────────────

class QaReporter implements Reporter {
  private startTime: number = Date.now();
  private endTime: number = Date.now();
  private config: FullConfig | null = null;
  private tests: TestRecord[] = [];
  private totalTests: number = 0;

  // Output paths (relative to foofoo-tests/ working dir)
  private readonly outputDir = path.resolve(__dirname, '../../reports/e2e');
  private readonly mdPath: string;
  private readonly htmlPath: string;

  constructor() {
    this.mdPath   = path.join(this.outputDir, 'qa-summary.md');
    this.htmlPath = path.join(this.outputDir, 'qa-report.html');
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config    = config;
    this.startTime = Date.now();
    this.totalTests = suite.allTests().length;
    // Ensure output directory exists
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Extract TC ID and suite from the full test title
    const fullTitle  = test.titlePath().join(' | ');
    const tcId       = extractTcId(fullTitle);
    const suiteName  = extractSuiteName(fullTitle);
    const testTitle  = extractTestTitle(fullTitle);

    // Try to read screenshot attachment (if any)
    let screenshotPath: string | undefined;
    let screenshotBase64: string | undefined;

    for (const attachment of result.attachments) {
      if (
        attachment.name === 'screenshot' &&
        attachment.path &&
        fs.existsSync(attachment.path)
      ) {
        screenshotPath = attachment.path;
        try {
          const buf = fs.readFileSync(attachment.path);
          screenshotBase64 = buf.toString('base64');
        } catch {
          // Non-fatal: screenshot may not be readable
        }
        break;
      }
    }

    const record: TestRecord = {
      id:           tcId,
      suiteName,
      title:        testTitle,
      status:       result.status,
      durationMs:   result.duration,
      error:        result.error
        ? (result.error.message ?? result.error.value ?? 'Unknown error')
        : undefined,
      screenshotPath,
      screenshotBase64,
      retries:      result.retry,
      projectName:  test.parent?.project()?.name ?? 'Unknown',
    };

    this.tests.push(record);
  }

  onEnd(result: FullResult): void {
    this.endTime = Date.now();

    const totalDurationMs = this.endTime - this.startTime;
    const passed      = this.tests.filter(t => t.status === 'passed').length;
    const failed      = this.tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
    const skipped     = this.tests.filter(t => t.status === 'skipped').length;
    const interrupted = this.tests.filter(t => t.status === 'interrupted').length;
    const total       = this.tests.length;

    // Group tests by suite
    const suiteMap = new Map<string, TestRecord[]>();
    for (const t of this.tests) {
      const existing = suiteMap.get(t.suiteName) ?? [];
      existing.push(t);
      suiteMap.set(t.suiteName, existing);
    }

    const baseURL   = this.config?.projects?.[0]?.use?.baseURL ?? process.env.BASE_URL ?? 'http://localhost:8081';
    const dateStr   = new Date().toISOString().slice(0, 10);
    const runDate   = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const failures  = this.tests.filter(t => t.status === 'failed' || t.status === 'timedOut');

    // ── 1. Write Markdown report ────────────────────────────────────────────
    const md = this.buildMarkdown({
      dateStr,
      runDate,
      baseURL,
      total,
      passed,
      failed,
      skipped,
      interrupted,
      totalDurationMs,
      suiteMap,
      failures,
    });
    fs.writeFileSync(this.mdPath, md, 'utf8');

    // ── 2. Write HTML report ────────────────────────────────────────────────
    const html = this.buildHtml({
      dateStr,
      runDate,
      baseURL,
      total,
      passed,
      failed,
      skipped,
      interrupted,
      totalDurationMs,
      suiteMap,
      failures,
    });
    fs.writeFileSync(this.htmlPath, html, 'utf8');

    // Log paths so CI can pick them up
    console.log(`\n[QA Reporter] Markdown → ${this.mdPath}`);
    console.log(`[QA Reporter] HTML     → ${this.htmlPath}\n`);
  }

  // ─── Markdown builder ──────────────────────────────────────────────────────

  private buildMarkdown(args: {
    dateStr: string;
    runDate: string;
    baseURL: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    interrupted: number;
    totalDurationMs: number;
    suiteMap: Map<string, TestRecord[]>;
    failures: TestRecord[];
  }): string {
    const {
      dateStr, runDate, baseURL, total, passed, failed, skipped, interrupted,
      totalDurationMs, suiteMap, failures,
    } = args;

    const lines: string[] = [];

    lines.push('# FooFoo Web App — E2E QA Report');
    lines.push('');
    lines.push(`**Date:** ${runDate} | **Environment:** ${baseURL} | **Run by:** Playwright`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('| Total | ✅ Pass | ❌ Fail | ⏭️ Skip | ⚠️ Other | Duration |');
    lines.push('|-------|---------|---------|---------|----------|----------|');
    lines.push(
      `| ${total} | ${passed} | ${failed} | ${skipped} | ${interrupted} | ${formatDuration(totalDurationMs)} |`,
    );
    lines.push('');

    // Per-suite tables
    for (const [suiteName, tests] of suiteMap.entries()) {
      lines.push(`## ${suiteName}`);
      lines.push('');
      lines.push('| ID | Test Case | Status | Duration | Retries | Notes |');
      lines.push('|----|-----------|--------|----------|---------|-------|');
      for (const t of tests) {
        const notes = t.error
          ? t.error.split('\n')[0].slice(0, 80).replace(/\|/g, '\\|')
          : '';
        const retryBadge = t.retries > 0 ? `${t.retries}x` : '';
        lines.push(
          `| ${t.id} | ${t.title.slice(0, 60)} | ${statusEmoji(t.status)} | ${formatDuration(t.durationMs)} | ${retryBadge} | ${notes} |`,
        );
      }
      lines.push('');
    }

    // Failure detail section
    if (failures.length > 0) {
      lines.push('## Failures Detail');
      lines.push('');
      for (const f of failures) {
        lines.push(`### ${f.id} | ${f.title}`);
        lines.push('');
        if (f.error) {
          lines.push('**Error:**');
          lines.push('```');
          lines.push(f.error.slice(0, 2000));
          lines.push('```');
        }
        if (f.screenshotPath) {
          lines.push(`**Screenshot:** \`${path.basename(f.screenshotPath)}\``);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push(`*Generated by QA Reporter — ${dateStr}*`);

    return lines.join('\n');
  }

  // ─── HTML builder ──────────────────────────────────────────────────────────

  private buildHtml(args: {
    dateStr: string;
    runDate: string;
    baseURL: string;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    interrupted: number;
    totalDurationMs: number;
    suiteMap: Map<string, TestRecord[]>;
    failures: TestRecord[];
  }): string {
    const {
      dateStr, runDate, baseURL, total, passed, failed, skipped, interrupted,
      totalDurationMs, suiteMap, failures,
    } = args;

    const overallStatus = failed > 0 ? '#ef4444' : '#22c55e';
    const overallLabel  = failed > 0 ? 'FAIL' : 'PASS';

    const css = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f8fafc;
        color: #0f172a;
        line-height: 1.6;
        padding: 24px;
      }
      .container { max-width: 1100px; margin: 0 auto; }
      header {
        background: #fff;
        border-radius: 12px;
        padding: 24px 32px;
        box-shadow: 0 1px 4px rgba(0,0,0,.08);
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
      }
      header h1 { font-size: 20px; font-weight: 700; color: #0f172a; }
      header .meta { font-size: 13px; color: #64748b; margin-top: 4px; }
      .overall-badge {
        background: ${overallStatus};
        color: #fff;
        font-size: 18px;
        font-weight: 700;
        padding: 8px 20px;
        border-radius: 8px;
        letter-spacing: .5px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .summary-card {
        background: #fff;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 1px 4px rgba(0,0,0,.08);
      }
      .summary-card .number {
        font-size: 36px;
        font-weight: 800;
        line-height: 1.1;
      }
      .summary-card .label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: .5px; }
      .card-total   .number { color: #0f172a; }
      .card-pass    .number { color: #22c55e; }
      .card-fail    .number { color: #ef4444; }
      .card-skip    .number { color: #a3a3a3; }
      .card-other   .number { color: #eab308; }
      .card-dur     .number { font-size: 24px; color: #6366f1; }
      section {
        background: #fff;
        border-radius: 10px;
        padding: 24px;
        box-shadow: 0 1px 4px rgba(0,0,0,.08);
        margin-bottom: 20px;
      }
      section h2 {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 16px;
        padding-bottom: 10px;
        border-bottom: 2px solid #f1f5f9;
        color: #1e293b;
      }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th {
        background: #f8fafc;
        padding: 8px 12px;
        text-align: left;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .5px;
        color: #64748b;
        border-bottom: 1px solid #e2e8f0;
      }
      td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: #f8fafc; }
      .tc-id { font-family: monospace; font-size: 11px; color: #6366f1; font-weight: 600; white-space: nowrap; }
      .duration { font-family: monospace; font-size: 12px; color: #64748b; }
      .retry-badge {
        background: #fef3c7;
        color: #92400e;
        font-size: 10px;
        padding: 1px 5px;
        border-radius: 3px;
        font-family: monospace;
      }
      .error-note { color: #ef4444; font-size: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .failure-block {
        border-left: 4px solid #ef4444;
        padding: 16px;
        background: #fff5f5;
        border-radius: 0 8px 8px 0;
        margin-bottom: 16px;
      }
      .failure-block h3 { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
      pre {
        background: #1e293b;
        color: #e2e8f0;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 12px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
        margin-top: 8px;
      }
      .screenshot-thumb { margin-top: 12px; }
      .screenshot-thumb img { max-width: 100%; max-height: 300px; border-radius: 6px; border: 1px solid #e2e8f0; }
      footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; }
    `.trim();

    // ── Build suite tables HTML ─────────────────────────────────────────────
    let suitesHtml = '';
    for (const [suiteName, tests] of suiteMap.entries()) {
      const suitePass = tests.filter(t => t.status === 'passed').length;
      const suiteFail = tests.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
      const suiteSkip = tests.filter(t => t.status === 'skipped').length;

      suitesHtml += `
      <section>
        <h2>${escHtml(suiteName)} &nbsp;
          <small style="font-weight:400;color:#64748b;font-size:12px">
            ${suitePass} pass · ${suiteFail} fail · ${suiteSkip} skip
          </small>
        </h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Test Case</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Project</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${tests.map(t => `
            <tr>
              <td class="tc-id">${escHtml(t.id)}</td>
              <td>${escHtml(t.title.slice(0, 80))}${t.title.length > 80 ? '…' : ''}</td>
              <td>${statusBadge(t.status)}</td>
              <td class="duration">${formatDuration(t.durationMs)}${t.retries > 0 ? ` <span class="retry-badge">${t.retries}x</span>` : ''}</td>
              <td style="font-size:11px;color:#64748b">${escHtml(t.projectName)}</td>
              <td>${t.error ? `<span class="error-note" title="${escHtml(t.error.slice(0, 200))}">${escHtml(t.error.split('\n')[0].slice(0, 60))}</span>` : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </section>`;
    }

    // ── Build failures section HTML ─────────────────────────────────────────
    let failuresHtml = '';
    if (failures.length > 0) {
      failuresHtml = `
      <section>
        <h2>❌ Failures Detail</h2>
        ${failures.map(f => `
        <div class="failure-block">
          <h3>${escHtml(f.id)} | ${escHtml(f.title)}</h3>
          ${f.error ? `<pre>${escHtml(f.error.slice(0, 3000))}</pre>` : ''}
          ${f.screenshotBase64 ? `
          <div class="screenshot-thumb">
            <p style="font-size:12px;color:#64748b;margin-bottom:6px">Screenshot at failure:</p>
            <img src="data:image/png;base64,${f.screenshotBase64}" alt="Failure screenshot for ${escHtml(f.id)}" />
          </div>` : (f.screenshotPath ? `<p style="font-size:12px;margin-top:8px">Screenshot: <code>${escHtml(path.basename(f.screenshotPath))}</code></p>` : '')}
        </div>`).join('')}
      </section>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FooFoo E2E QA Report — ${dateStr}</title>
  <style>${css}</style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>FooFoo Web App — E2E QA Report</h1>
        <div class="meta">
          <strong>Date:</strong> ${escHtml(runDate)} &nbsp;|&nbsp;
          <strong>Environment:</strong> ${escHtml(baseURL)} &nbsp;|&nbsp;
          <strong>Runner:</strong> Playwright
        </div>
      </div>
      <div class="overall-badge">${overallLabel}</div>
    </header>

    <div class="summary-grid">
      <div class="summary-card card-total">
        <div class="number">${total}</div>
        <div class="label">Total</div>
      </div>
      <div class="summary-card card-pass">
        <div class="number">${passed}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card card-fail">
        <div class="number">${failed}</div>
        <div class="label">Failed</div>
      </div>
      <div class="summary-card card-skip">
        <div class="number">${skipped}</div>
        <div class="label">Skipped</div>
      </div>
      <div class="summary-card card-other">
        <div class="number">${interrupted}</div>
        <div class="label">Interrupted</div>
      </div>
      <div class="summary-card card-dur">
        <div class="number">${formatDuration(totalDurationMs)}</div>
        <div class="label">Duration</div>
      </div>
    </div>

    ${suitesHtml}
    ${failuresHtml}

    <footer>Generated by QA Reporter · FooFoo E2E Test Suite · ${escHtml(dateStr)}</footer>
  </div>
</body>
</html>`;
  }
}

// ─── HTML escape helper ───────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Export for Playwright reporter registration ──────────────────────────────

export default QaReporter;
