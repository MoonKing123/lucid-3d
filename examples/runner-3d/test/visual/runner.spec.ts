/**
 * M1 — 3D Runner 视觉回归测试
 * Issue #216：端到端 Playwright 视觉验证
 *
 * 运行前需启动 dev server：
 *   cd examples/runner-3d && npx vite --port 5174
 * 然后执行：
 *   npx playwright test --config examples/runner-3d/playwright.config.ts
 */
import { test, expect } from '@playwright/test';

test.describe('M1 — 3D Runner visual regression', () => {
  test('初始帧渲染无控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('http://localhost:5174/');
    await page.waitForSelector('canvas[data-ready="1"]', { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test('canvas 截图匹配基线', async ({ page }) => {
    await page.goto('http://localhost:5174/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(500); // 让相机/动画稳定

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('runner-initial.png', { maxDiffPixels: 200 });
  });

  test('2 秒后玩家已向前移动', async ({ page }) => {
    await page.goto('http://localhost:5174/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(2000);

    // 通过 window.__game 读取玩家位置（z 轴向前）
    const z = await page.evaluate(() => {
      const game = (window as any).__game;
      return game?.player?.node?.position?.[2];
    });
    expect(z).toBeGreaterThan(0);
  });
});
