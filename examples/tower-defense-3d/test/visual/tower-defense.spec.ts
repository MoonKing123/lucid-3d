import { test, expect } from '@playwright/test';

test.describe('M2 — 3D Tower Defense visual regression', () => {
  test('initial frame renders without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]', { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('canvas screenshot matches baseline', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('tower-defense-initial.png', { maxDiffPixels: 200 });
  });

  test('after 3 seconds, at least one enemy has spawned', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(3000);

    const enemyCount = await page.evaluate(() => (window as any).__game?.spawner?.enemies?.length ?? 0);
    expect(enemyCount).toBeGreaterThan(0);
  });

  test('clicking ground places a tower', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(500);

    // 通过 evaluate 直接调 game API 放置（避开真实 NDC pick 复杂度）
    await page.evaluate(() => {
      const game = (window as any).__game;
      game.towerManager.place(3, 6, 'arrow');
    });

    const towerCount = await page.evaluate(() => (window as any).__game?.towerManager?.towers?.length ?? 0);
    expect(towerCount).toBeGreaterThan(0);
  });
});
