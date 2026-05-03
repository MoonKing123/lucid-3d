/**
 * M6.4 — HUD + Esc 菜单视觉回归测试
 * 运行前需启动 dev server：
 *   cd examples/action-rpg-v2 && npx vite --port 5176
 * 然后执行：
 *   npx playwright test --config examples/action-rpg-v2/playwright.config.ts
 */
import { test, expect } from '@playwright/test';

test.describe('M6.4 — HUD visual regression', () => {
  test('初始帧渲染无控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:5176/');
    await page.waitForSelector('canvas[data-ready="1"]', { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('HUD 截图匹配基线', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('hud-initial.png', { maxDiffPixels: 300 });
  });

  test('Esc 菜单截图匹配基线', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(500);

    // 通过 window.__game 打开 Esc 菜单
    await page.evaluate(() => {
      const game = (window as unknown as { __game: { handleKey(k: string): void } }).__game;
      game.handleKey('Escape');
    });
    await page.waitForTimeout(100);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('esc-menu.png', { maxDiffPixels: 300 });
  });

  test('按 I 键打开背包后截图匹配基线', async ({ page }) => {
    await page.goto('http://localhost:5176/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const game = (window as unknown as { __game: { handleKey(k: string): void } }).__game;
      game.handleKey('I');
    });
    await page.waitForTimeout(100);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('inventory-open.png', { maxDiffPixels: 300 });
  });
});
