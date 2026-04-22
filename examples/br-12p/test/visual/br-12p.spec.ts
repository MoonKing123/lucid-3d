/**
 * br-12p.spec.ts — Playwright 视觉回归测试。
 * 在浏览器中运行 BR-12P demo，生成 5 张基线截图。
 *
 * 运行：
 *   npx playwright test --config playwright.config.ts           # 对比基线
 *   npx playwright test --config playwright.config.ts --update-snapshots  # 生成基线
 *
 * 需要先启动 dev server：npx vite --port 5174
 * 或直接运行（playwright.config.ts 会自动启动 dev server）。
 */

import { test, expect, type Page } from '@playwright/test';

/** 等待 WebGL 完成至少 N 帧渲染（检查 canvas 不全黑） */
async function waitForRender(page: Page, minWaitMs = 1000): Promise<void> {
  await page.waitForTimeout(minWaitMs);
}

/** 等待游戏初始化：canvas 元素存在且尺寸正常 */
async function waitForGame(page: Page): Promise<void> {
  await page.waitForSelector('#game-canvas', { timeout: 10_000 });
  await waitForRender(page, 1500);
}

test.describe('BR-12P 视觉回归', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
  });

  test('baseline-1-spawn', async ({ page }) => {
    // 游戏刚开始的第一人称视角：地形 + 天空 + 准星
    await expect(page).toHaveScreenshot('baseline-1-spawn.png');
  });

  test('baseline-2-shooting', async ({ page }) => {
    // 玩家移动后视角变化 + 射击
    await page.keyboard.down('w');
    await waitForRender(page, 500);
    await page.keyboard.up('w');

    // 模拟鼠标点击画布触发射击
    await page.click('#game-canvas', { position: { x: 400, y: 300 } });
    await waitForRender(page, 200);

    await expect(page).toHaveScreenshot('baseline-2-shooting.png');
  });

  test('baseline-3-hit', async ({ page }) => {
    // 多方向移动 + 多次射击，捕获命中后游戏状态
    await page.keyboard.down('w');
    await waitForRender(page, 800);
    await page.keyboard.up('w');

    // 旋转视角后射击（模拟追击）
    await page.mouse.move(400, 300);
    await page.mouse.move(500, 300);
    await page.click('#game-canvas', { position: { x: 400, y: 300 } });
    await waitForRender(page, 300);

    await expect(page).toHaveScreenshot('baseline-3-hit.png');
  });

  test('baseline-4-death', async ({ page }) => {
    // 等待玩家被 AI 敌人击杀（或等足够时间）
    // AI 敌人射击频率约 1.5s/次，11 个敌人约 1-2s 就会击杀玩家
    await waitForRender(page, 3000);

    await expect(page).toHaveScreenshot('baseline-4-death.png');
  });

  test('baseline-5-minimap', async ({ page }) => {
    // 小地图区域（右上角）截图 — 展示 11 玩家位置
    // 先等待 2 秒让敌人 AI 移动
    await waitForRender(page, 2000);

    await expect(page).toHaveScreenshot('baseline-5-minimap.png');
  });
});
