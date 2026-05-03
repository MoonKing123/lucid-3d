/**
 * action-rpg-v2.spec.ts — M6.5 Playwright 视觉回归测试（5 张基线截图）
 *
 * 基线：
 *   1. initial-scene    — 初始场景（玩家 + Enemy + 地形 + HUD）
 *   2. combat-trail     — 战斗中（剑气拖尾）
 *   3. bow-shooting     — 远程射箭（弓箭沿抛物线飞行）
 *   4. esc-menu         — Esc 菜单打开（UISlider/UIDropdown/UITextInput）
 *   5. inventory-open   — 背包打开（4×4 grid）
 *
 * 运行：
 *   npx playwright test --config playwright.config.ts                    # 对比基线
 *   npx playwright test --config playwright.config.ts --update-snapshots # 生成基线
 */

import { test, expect, type Page } from '@playwright/test';

/** 等待 canvas 渲染就绪并稳定 */
async function waitForGame(page: Page): Promise<void> {
  await page.waitForSelector('canvas[data-ready="1"]', { timeout: 15_000 });
  await page.waitForTimeout(600);
}

test.describe('action-rpg-v2 视觉回归 — 5 张基线', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
  });

  // ── 1. 初始场景 ──────────────────────────────────────────────────────
  test('baseline-1-initial（初始场景：玩家 + Enemy + 地形 + HUD）', async ({ page }) => {
    await page.waitForTimeout(300);
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('initial-scene.png', { maxDiffPixels: 500 });
  });

  // ── 2. 战斗中（剑气拖尾）────────────────────────────────────────────
  test('baseline-2-combat-trail（剑气拖尾）', async ({ page }) => {
    // 触发近战攻击（TrailRenderer 剑气，lifetime=0.35s）
    await page.evaluate(() => {
      const game = (window as unknown as {
        __game: { triggerMeleeAttack(): void };
      }).__game;
      game.triggerMeleeAttack();
    });

    // 在 trail 存活期间截图（0.1s < trail lifetime 0.35s）
    await page.waitForTimeout(100);
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('combat-trail.png', { maxDiffPixels: 500 });
  });

  // ── 3. 远程射箭（弓箭沿抛物线飞行）──────────────────────────────────
  test('baseline-3-bow-shooting（弓箭飞行中）', async ({ page }) => {
    // 触发射箭（BOW_FLIGHT_T=1.2s）
    await page.evaluate(() => {
      const game = (window as unknown as {
        __game: { triggerBowShoot(): void };
      }).__game;
      game.triggerBowShoot();
    });

    // 在弓箭飞行中途截图（0.4s 约处于 1/3 路程）
    await page.waitForTimeout(400);
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('bow-shooting.png', { maxDiffPixels: 500 });
  });

  // ── 4. Esc 菜单打开（UISlider/UIDropdown/UITextInput）───────────────
  test('baseline-4-esc-menu（设置菜单）', async ({ page }) => {
    await page.evaluate(() => {
      const game = (window as unknown as {
        __game: { handleKey(key: string): void };
      }).__game;
      game.handleKey('Escape');
    });

    await page.waitForTimeout(200);
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('esc-menu.png', { maxDiffPixels: 500 });
  });

  // ── 5. 背包打开（4×4 grid）──────────────────────────────────────────
  test('baseline-5-inventory（背包）', async ({ page }) => {
    await page.evaluate(() => {
      const game = (window as unknown as {
        __game: { handleKey(key: string): void };
      }).__game;
      game.handleKey('I');
    });

    await page.waitForTimeout(200);
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('inventory-open.png', { maxDiffPixels: 500 });
  });
});
