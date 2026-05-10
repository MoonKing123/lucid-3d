/**
 * 通用回归截图器 — 启动任意 example 的 vite dev server + Playwright headless 浏览，
 * 截 0s/5s/15s/30s 四个时刻。
 *
 * 用法：
 *   tsx scripts/regression-screenshot.ts --demo <name> --phase <n> [options]
 *   tsx scripts/regression-screenshot.ts --demo all --phase <n> [options]
 */

import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { Page } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const VALID_DEMOS = ['runner-3d', 'action-rpg', 'action-rpg-v2', 'br-12p', 'slg-3d', 'tower-defense-3d'] as const;
type DemoName = (typeof VALID_DEMOS)[number] | 'all';

// ——— 纯函数（供测试 import）———

export function parseMoments(moments: string | undefined): number[] {
  if (moments === undefined) return [0, 5000, 15000, 30000];
  return moments.split(',').map((s) => {
    const m = s.trim().match(/^(\d+)s$/);
    if (!m) throw new Error(`无效的时刻格式: "${s}"，期望如 "5s"`);
    return Number(m[1]) * 1000;
  });
}

export function parseDemoName(name: string): DemoName {
  if (name === 'all') return 'all';
  if ((VALID_DEMOS as readonly string[]).includes(name)) return name as DemoName;
  throw new Error(`未知 demo 名称: "${name}"，有效值: ${[...VALID_DEMOS, 'all'].join(', ')}`);
}

export function generateOutputPath(opts: {
  phase: number;
  demo: string;
  moment: number;
  out?: string;
}): string {
  const seconds = opts.moment / 1000;
  const filename = `${seconds}s.png`;
  if (opts.out) return join(opts.out, filename);
  return join('docs', 'regression', `phase-${opts.phase}`, opts.demo, filename);
}

export function scheduleScreenshots(
  page: Page,
  moments: number[],
  opts: { phase: number; demo: string; out?: string },
): Promise<void> {
  return new Promise((resolve, reject) => {
    let completed = 0;
    const total = moments.length;

    for (const moment of moments) {
      setTimeout(() => {
        const path = generateOutputPath({ ...opts, moment });
        page
          .screenshot({ path, fullPage: false })
          .then(() => {
            completed++;
            if (completed === total) resolve();
          })
          .catch(reject);
      }, moment);
    }

    if (total === 0) resolve();
  });
}

// ——— 运行时逻辑（仅在 CLI 直接执行时运行）———

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {
      // server 尚未就绪，继续等待
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`等待 server 超时: ${url}`);
}

async function runDemo(
  demo: string,
  opts: {
    phase: number;
    moments: number[];
    out?: string;
    timeout: number;
    port: number;
    viewport: { width: number; height: number };
  },
): Promise<{ status: 'pass' | 'broken'; screenshots?: string[]; error?: string }> {
  const { chromium } = await import('@playwright/test');

  const demoDir = join(PROJECT_ROOT, 'examples', demo);
  const port = opts.port || Math.floor(Math.random() * 10000 + 20000);
  const url = `http://localhost:${port}/`;

  const vite = spawn('npx', ['vite', '--port', String(port)], {
    cwd: demoDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    await waitForServer(url, 30000);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: opts.viewport,
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const outDir = opts.out ?? join(PROJECT_ROOT, 'docs', 'regression', `phase-${opts.phase}`, demo);
    await mkdir(outDir, { recursive: true });

    await scheduleScreenshots(page, opts.moments, { phase: opts.phase, demo, out: outDir });

    const screenshots = opts.moments.map((m) => `${m / 1000}s.png`);
    return { status: 'pass', screenshots };
  } catch (err) {
    const error = err instanceof Error ? err.stack ?? err.message : String(err);
    return { status: 'broken', error };
  } finally {
    browser?.close().catch(() => {});
    try {
      process.kill(vite.pid!, 'SIGTERM');
    } catch {
      // 进程可能已经退出
    }
  }
}

function parseViewport(s: string): { width: number; height: number } {
  const m = s.match(/^(\d+)x(\d+)$/);
  if (!m) throw new Error(`无效的 viewport 格式: "${s}"，期望如 "1280x720"`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

async function main() {
  const args = process.argv.slice(2);

  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const demoArg = get('--demo');
  const phaseArg = get('--phase');

  if (!demoArg || !phaseArg) {
    console.error('用法: tsx scripts/regression-screenshot.ts --demo <name> --phase <n>');
    process.exit(1);
  }

  const demoName = parseDemoName(demoArg);
  const phase = Number(phaseArg);
  const moments = parseMoments(get('--moments'));
  const out = get('--out');
  const timeout = Number(get('--timeout') ?? 60000);
  const portArg = Number(get('--port') ?? 0);
  const viewport = parseViewport(get('--viewport') ?? '1280x720');

  if (demoName === 'all') {
    const results: Record<string, unknown> = {};
    for (const demo of VALID_DEMOS) {
      process.stderr.write(`[regression] 运行 ${demo} ...\n`);
      results[demo] = await runDemo(demo, { phase, moments, out, timeout, port: portArg, viewport });
    }
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  } else {
    const result = await runDemo(demoName, { phase, moments, out, timeout, port: portArg, viewport });
    if (result.status === 'broken') {
      process.stderr.write(result.error + '\n');
      process.stdout.write(JSON.stringify({ demo: demoName, ...result }, null, 2) + '\n');
      process.exit(1);
    }
    process.stdout.write(
      JSON.stringify({ demo: demoName, status: result.status, screenshots: result.screenshots }, null, 2) + '\n',
    );
  }
}

// 只在作为 CLI 入口执行时运行 main
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    process.stderr.write(err.stack ?? err.message);
    process.exit(1);
  });
}
