/**
 * Lucid-3D Visual Regression Test Suite
 *
 * Auto-discovers demo pages from demos.json, takes screenshots,
 * compares with baselines using pixelmatch.
 *
 * Usage:
 *   node test/visual/flywheel-test.mjs           # Compare against baselines
 *   node test/visual/flywheel-test.mjs --update   # Regenerate baselines
 */
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = resolve(__dirname, 'baselines');
const DIFF_DIR = resolve(__dirname, 'diffs');
const DEMOS_FILE = resolve(__dirname, 'demos.json');
const UPDATE = process.argv.includes('--update');
const MAX_DIFF_RATIO = 0.01;
const BASE_URL = 'http://localhost:5173';

// Find Chromium
const localPaths = [
  resolve(homedir(), 'Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  resolve(homedir(), '.cache/ms-playwright/chromium-1148/chrome-linux/chrome'),
];
const chromiumPath = localPaths.find(p => existsSync(p)) || undefined;

// ── Test infrastructure ─────────────────────────────────────────

let browser, page;
let passed = 0, failed = 0;

async function setup() {
  mkdirSync(BASELINE_DIR, { recursive: true });
  mkdirSync(DIFF_DIR, { recursive: true });

  browser = await chromium.launch({
    executablePath: chromiumPath,
    headless: true,
    args: [
      '--use-angle=swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });
  page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  page.on('pageerror', err => console.log(`  [browser error] ${err.message}`));
}

async function teardown() {
  await browser.close();
}

async function screenshotCanvas() {
  const canvas = page.locator('#canvas');
  return await canvas.screenshot({ type: 'png' });
}

function compareScreenshots(name, actual) {
  const baselinePath = resolve(BASELINE_DIR, `${name}.png`);

  if (UPDATE || !existsSync(baselinePath)) {
    writeFileSync(baselinePath, actual);
    console.log(`  [baseline] saved ${name}.png (${actual.length} bytes)`);
    return { match: true, updated: true };
  }

  const baseline = readFileSync(baselinePath);
  const img1 = PNG.sync.read(baseline);
  const img2 = PNG.sync.read(actual);

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return { match: false, reason: `size mismatch: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}` };
  }

  const diff = new PNG({ width: img1.width, height: img1.height });
  const diffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.2 });
  const totalPixels = img1.width * img1.height;
  const diffRatio = diffPixels / totalPixels;

  if (diffRatio > MAX_DIFF_RATIO) {
    writeFileSync(resolve(DIFF_DIR, `${name}-diff.png`), PNG.sync.write(diff));
    writeFileSync(resolve(DIFF_DIR, `${name}-actual.png`), actual);
    return { match: false, diffPixels, diffRatio, reason: `${(diffRatio * 100).toFixed(2)}% pixels differ (${diffPixels}/${totalPixels})` };
  }

  return { match: true, diffPixels, diffRatio };
}

function test(name, result) {
  if (result.match) {
    passed++;
    const extra = result.updated ? ' (baseline updated)' :
                  result.diffPixels != null ? ` (${result.diffPixels} px diff)` : '';
    console.log(`  PASS  ${name}${extra}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} — ${result.reason}`);
  }
}

async function navigateAndWait(url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const c = document.getElementById('canvas');
    return c && c.dataset.ready === '1';
  }, { timeout: 5000 });
}

// ── Load demos ──────────────────────────────────────────────────

const demos = JSON.parse(readFileSync(DEMOS_FILE, 'utf-8'));

// ── Run tests ───────────────────────────────────────────────────

console.log('\n=== Lucid-3D Visual Regression Tests ===\n');
console.log(`Demos: ${demos.length} | Mode: ${UPDATE ? 'UPDATE baselines' : 'COMPARE'}\n`);

await setup();

// Part 1: Screenshot each demo and compare/update baselines
for (const demo of demos) {
  console.log(`[${demo.name}] ${demo.description}`);
  try {
    await navigateAndWait(`${BASE_URL}${demo.page}`);
    const shot = await screenshotCanvas();
    test(demo.name, compareScreenshots(demo.name, shot));
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${demo.name} — ${err.message}`);
  }
}

// Part 2: Determinism check — reload first demo and verify 0 diff
console.log('\n[determinism] Reload first demo and verify pixel-perfect match');
try {
  const firstDemo = demos[0];
  await navigateAndWait(`${BASE_URL}${firstDemo.page}`);
  const shot1 = await screenshotCanvas();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const c = document.getElementById('canvas');
    return c && c.dataset.ready === '1';
  }, { timeout: 5000 });
  const shot2 = await screenshotCanvas();
  const img1 = PNG.sync.read(shot1);
  const img2 = PNG.sync.read(shot2);
  const detDiff = pixelmatch(img1.data, img2.data, null, img1.width, img1.height, { threshold: 0 });
  if (detDiff === 0) {
    passed++;
    console.log('  PASS  determinism (0 pixels differ)');
  } else {
    failed++;
    console.log(`  FAIL  determinism — ${detDiff} pixels differ between two renders`);
  }
} catch (err) {
  failed++;
  console.log(`  FAIL  determinism — ${err.message}`);
}

// Part 3: WebGL context check
console.log('\n[webgl] Context verification');
const glInfo = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const gl = c?.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) return null;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
    version: gl.getParameter(gl.VERSION),
  };
});
if (glInfo) {
  passed++;
  console.log(`  PASS  webgl-context`);
  console.log(`  Renderer: ${glInfo.renderer}`);
} else {
  failed++;
  console.log('  FAIL  webgl-context — null');
}

await teardown();

// ── Summary ─────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
