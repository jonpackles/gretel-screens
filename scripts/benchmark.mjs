#!/usr/bin/env node

/**
 * Benchmark script for Screens v1
 *
 * Usage:
 *   node scripts/benchmark.mjs              # Run against http://localhost:3000
 *   node scripts/benchmark.mjs --save       # Run and save baseline to scripts/benchmark-baseline.json
 *   node scripts/benchmark.mjs --compare    # Run and compare against saved baseline
 *   PORT=3001 node scripts/benchmark.mjs    # Custom port
 */

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const args = process.argv.slice(2);
const shouldSave = args.includes('--save');
const shouldCompare = args.includes('--compare');

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(__dirname, 'benchmark-baseline.json');

// ── Helpers ──────────────────────────────────────────────────────────

async function timedFetch(label, url, validate) {
  const start = performance.now();
  let result = { label, url, ok: false, ms: 0, detail: '' };

  try {
    const res = await fetch(url);
    const ms = Math.round(performance.now() - start);
    result.ms = ms;

    if (!res.ok) {
      result.detail = `HTTP ${res.status}`;
      return result;
    }

    const data = await res.json();
    const validation = validate(data);
    result.ok = validation.ok;
    result.detail = validation.detail;
    result.snapshot = validation.snapshot || {};
  } catch (err) {
    result.ms = Math.round(performance.now() - start);
    result.detail = err.code === 'ECONNREFUSED'
      ? 'Server not running'
      : err.message;
  }

  return result;
}

function pad(str, len) {
  return String(str).padEnd(len);
}

function rpad(str, len) {
  return String(str).padStart(len);
}

// ── Test definitions ──────────────────────────────────────────────────

const tests = [
  {
    label: 'Media API (projects, recursive)',
    url: `${BASE_URL}/api/media?path=linked-content/projects&recursive=true&limit=10000&includeHidden=false`,
    validate: (data) => {
      const count = data.items?.length ?? 0;
      const stats = data.stats || {};
      return {
        ok: count > 0 && Array.isArray(data.items),
        detail: `${count} items, ${stats.totalFiles || '?'} total files`,
        snapshot: { itemCount: count, totalFiles: stats.totalFiles },
      };
    },
  },
  {
    label: 'Media API (dashboard view)',
    url: `${BASE_URL}/api/media?path=linked-content/projects&limit=5000&dashboard=true`,
    validate: (data) => {
      const count = data.items?.length ?? 0;
      return {
        ok: count > 0,
        detail: `${count} items (variants filtered)`,
        snapshot: { itemCount: count },
      };
    },
  },
  {
    label: 'Sequences API (screen-a)',
    url: `${BASE_URL}/api/sequences?screen=screen-a`,
    validate: (data) => {
      const seq = Array.isArray(data) ? data : [];
      const modes = seq.map(s => s.mode).join(', ');
      return {
        ok: seq.length > 0 && seq.every(s => s.mode),
        detail: `${seq.length} modes: ${modes}`,
        snapshot: { modeCount: seq.length, modes: seq.map(s => s.mode) },
      };
    },
  },
  {
    label: 'Sequences API (screen-b)',
    url: `${BASE_URL}/api/sequences?screen=screen-b`,
    validate: (data) => {
      const seq = Array.isArray(data) ? data : [];
      const modes = seq.map(s => s.mode).join(', ');
      return {
        ok: seq.length > 0 && seq.every(s => s.mode),
        detail: `${seq.length} modes: ${modes}`,
        snapshot: { modeCount: seq.length, modes: seq.map(s => s.mode) },
      };
    },
  },
  {
    label: 'Settings API',
    url: `${BASE_URL}/api/settings`,
    validate: (data) => {
      const keys = Object.keys(data || {});
      return {
        ok: keys.length > 0,
        detail: `${keys.length} settings: ${keys.join(', ')}`,
        snapshot: { settingKeys: keys },
      };
    },
  },
  {
    label: 'Inform API',
    url: `${BASE_URL}/api/inform`,
    validate: (data) => {
      const blocks = Array.isArray(data) ? data : [];
      const types = [...new Set(blocks.map(b => b.type))];
      return {
        ok: Array.isArray(data),
        detail: `${blocks.length} blocks (${types.join(', ') || 'none'})`,
        snapshot: { blockCount: blocks.length, types },
      };
    },
  },
  {
    label: 'Media API (cold, no cache)',
    url: `${BASE_URL}/api/media?path=linked-content/projects&recursive=true&limit=10000&includeHidden=false&_nocache=${Date.now()}`,
    validate: (data) => {
      const count = data.items?.length ?? 0;
      return {
        ok: count > 0,
        detail: `${count} items (cache-busted)`,
        snapshot: { itemCount: count },
      };
    },
  },
];

// ── Run ───────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n  Screens v1 Benchmark`);
  console.log(`  ${BASE_URL}`);
  console.log(`  ${new Date().toISOString()}\n`);

  // Check server is up
  try {
    await fetch(`${BASE_URL}/api/settings`);
  } catch {
    console.log(`  Server not reachable at ${BASE_URL}`);
    console.log(`  Start it with: npm run dev\n`);
    process.exit(1);
  }

  const results = [];

  for (const test of tests) {
    process.stdout.write(`  Running: ${test.label}...`);
    const result = await timedFetch(test.label, test.url, test.validate);
    results.push(result);

    // Clear the "Running" line and print result
    process.stdout.clearLine?.(0);
    process.stdout.cursorTo?.(0);

    const status = result.ok ? '  PASS' : '  FAIL';
    const time = rpad(`${result.ms}ms`, 7);
    console.log(`${status}  ${time}  ${pad(result.label, 35)} ${result.detail}`);
  }

  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const totalMs = results.reduce((sum, r) => sum + r.ms, 0);

  console.log(`\n  ─────────────────────────────────────────`);
  console.log(`  ${passed} passed, ${failed} failed, ${totalMs}ms total`);

  // Save baseline
  if (shouldSave) {
    const baseline = {
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        label: r.label,
        ms: r.ms,
        ok: r.ok,
        snapshot: r.snapshot,
      })),
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
    console.log(`\n  Baseline saved to scripts/benchmark-baseline.json`);
  }

  // Compare to baseline
  if (shouldCompare) {
    if (!existsSync(BASELINE_PATH)) {
      console.log(`\n  No baseline found. Run with --save first.`);
    } else {
      const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
      console.log(`\n  Compared to baseline from ${baseline.timestamp}:\n`);

      for (const result of results) {
        const base = baseline.results.find(b => b.label === result.label);
        if (!base) {
          console.log(`  NEW     ${pad(result.label, 35)} ${result.ms}ms`);
          continue;
        }

        const diff = result.ms - base.ms;
        const pct = base.ms > 0 ? Math.round((diff / base.ms) * 100) : 0;
        const arrow = diff < 0 ? 'FASTER' : diff > 0 ? 'SLOWER' : 'SAME  ';
        const sign = diff < 0 ? '' : '+';
        const snapChanged = JSON.stringify(result.snapshot) !== JSON.stringify(base.snapshot);
        const dataNote = snapChanged ? ' [DATA CHANGED]' : '';

        console.log(
          `  ${arrow}  ${rpad(`${sign}${diff}ms`, 8)} (${sign}${pct}%)  ${pad(result.label, 35)} ${base.ms}ms → ${result.ms}ms${dataNote}`
        );
      }
    }
  }

  console.log('');
}

run();
