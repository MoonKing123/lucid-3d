/**
 * Lucid-3D Phase 0: Flywheel Validation Test
 *
 * This script validates the core flywheel mechanism:
 * 1. Launch headless browser with SwiftShader (CPU WebGL)
 * 2. Render WebGL content
 * 3. Take screenshot
 * 4. Compare with baseline (pixelmatch)
 * 5. Report pass/fail
 *
 * Usage:
 *   node test/flywheel-test.mjs [--update]   # --update to regenerate baselines
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
const UPDATE = process.argv.includes('--update');
const MAX_DIFF_RATIO = 0.01; // Allow 1% pixel difference

const chromiumPath = resolve(
  homedir(),
  'Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64',
  'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
);

// ── Test infrastructure ─────────────────────────────────────────

let browser, page;
let passed = 0, failed = 0;
const results = [];

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

async function takeCanvasScreenshot(name) {
  const canvas = page.locator('#canvas');
  const buffer = await canvas.screenshot({ type: 'png' });
  return buffer;
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
  const diffPixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {
    threshold: 0.2,
  });

  const totalPixels = img1.width * img1.height;
  const diffRatio = diffPixels / totalPixels;

  if (diffRatio > MAX_DIFF_RATIO) {
    const diffPath = resolve(DIFF_DIR, `${name}-diff.png`);
    writeFileSync(diffPath, PNG.sync.write(diff));
    writeFileSync(resolve(DIFF_DIR, `${name}-actual.png`), actual);
    return { match: false, diffPixels, diffRatio, reason: `${(diffRatio * 100).toFixed(2)}% pixels differ (${diffPixels}/${totalPixels})` };
  }

  return { match: true, diffPixels, diffRatio };
}

function test(name, result) {
  if (result.match) {
    passed++;
    const extra = result.updated ? ' (baseline updated)' : result.diffPixels != null ? ` (${result.diffPixels} pixels differ)` : '';
    console.log(`  PASS  ${name}${extra}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} — ${result.reason}`);
  }
  results.push({ name, ...result });
}

// ── Tests ────────────────────────────────────────────────────────

console.log('\n=== Lucid-3D Phase 0: Flywheel Validation ===\n');

await setup();

// Test 1: Static triangle rendering
console.log('Test 1: Static colored triangle');
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => {
  const c = document.getElementById('canvas');
  return c && c.dataset.ready === '1';
}, { timeout: 5000 });

const triangleShot = await takeCanvasScreenshot('triangle-static');
test('triangle-static', compareScreenshots('triangle-static', triangleShot));

// Test 2: WebGL context verification
console.log('Test 2: WebGL context check');
const glInfo = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const gl = c.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) return null;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    vendor: gl.getParameter(gl.VENDOR),
    renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
    version: gl.getParameter(gl.VERSION),
  };
});
if (glInfo) {
  test('webgl-context', { match: true });
  console.log(`  Renderer: ${glInfo.renderer}`);
  console.log(`  Version:  ${glInfo.version}`);
} else {
  test('webgl-context', { match: false, reason: 'WebGL context is null' });
}

// Test 3: Determinism — render same scene twice, compare
console.log('Test 3: Rendering determinism');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => {
  const c = document.getElementById('canvas');
  return c && c.dataset.ready === '1';
}, { timeout: 5000 });
const secondShot = await takeCanvasScreenshot('triangle-determinism');
const img1 = PNG.sync.read(triangleShot);
const img2 = PNG.sync.read(secondShot);
const detDiff = pixelmatch(img1.data, img2.data, null, img1.width, img1.height, { threshold: 0 });
if (detDiff === 0) {
  test('rendering-determinism', { match: true, diffPixels: 0 });
  console.log('  Two identical renders produced pixel-perfect match!');
} else {
  test('rendering-determinism', { match: false, diffPixels: detDiff, reason: `${detDiff} pixels differ between two renders of the same scene` });
}

// ── Incremental feature: Rotating triangle ──────────────────────

// Test 4: Rotating triangle at known angle
console.log('Test 4: Rotating triangle (angle=0.785 rad ≈ 45°)');
await page.goto('http://localhost:5173/rotating.html?angle=0.785');
await page.waitForFunction(() => {
  const c = document.getElementById('canvas');
  return c && c.dataset.ready === '1';
}, { timeout: 5000 });
const rotatedShot = await takeCanvasScreenshot('triangle-rotated-45');
test('triangle-rotated-45', compareScreenshots('triangle-rotated-45', rotatedShot));

// Test 5: Different angle produces different image
console.log('Test 5: Different angle → different image');
await page.goto('http://localhost:5173/rotating.html?angle=1.571');
await page.waitForFunction(() => {
  const c = document.getElementById('canvas');
  return c && c.dataset.ready === '1';
}, { timeout: 5000 });
const rotated90Shot = await takeCanvasScreenshot('triangle-rotated-90');
test('triangle-rotated-90', compareScreenshots('triangle-rotated-90', rotated90Shot));

// Verify 45° and 90° produce different images
const rot45 = PNG.sync.read(rotatedShot);
const rot90 = PNG.sync.read(rotated90Shot);
const angleDiff = pixelmatch(rot45.data, rot90.data, null, rot45.width, rot45.height, { threshold: 0.2 });
if (angleDiff > 100) {
  test('different-angles-differ', { match: true, diffPixels: angleDiff });
  console.log(`  45° and 90° differ by ${angleDiff} pixels — rotation works!`);
} else {
  test('different-angles-differ', { match: false, reason: `Only ${angleDiff} pixels differ — rotation may not be working` });
}

// ── REGRESSION CHECK ─────────────────────────────────────────────

// Test 6: Original static triangle is unchanged after adding rotation feature
console.log('Test 6: REGRESSION — static triangle still matches baseline');
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => {
  const c = document.getElementById('canvas');
  return c && c.dataset.ready === '1';
}, { timeout: 5000 });
const regressionShot = await takeCanvasScreenshot('regression-static');
const regressionResult = compareScreenshots('triangle-static', regressionShot);
test('regression-static-triangle', regressionResult);
if (regressionResult.match) {
  console.log('  Static triangle is pixel-perfect after adding rotation feature!');
}

await teardown();

// ── Summary ──────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed === 0) {
  console.log('FLYWHEEL VALIDATED: increment + regression check works!\n');
}
process.exit(failed > 0 ? 1 : 0);
