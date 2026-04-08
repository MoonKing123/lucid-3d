/**
 * M3 视觉回归测试 — SLG 大地图 demo
 *
 * 5 张基线截图：
 * 1. 初始世界视图（相机默认俯视）
 * 2. 相机缩放到最近单位视图
 * 3. 框选多个单位后的选中高亮
 * 4. 单位正在采集 + 资源数变化
 * 5. 暂停菜单
 */
import { test, expect } from '@playwright/test';

test.describe('M3 — SLG 大地图 visual regression', () => {
  test('1. 初始帧无 JS 错误且 canvas 就绪', async ({ page }) => {
    const jsErrors: string[] = [];
    // 只捕获 JavaScript 运行时错误，不捕获资源 404（字体/图标等不影响游戏功能）
    page.on('pageerror', err => jsErrors.push(err.message));

    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]', { timeout: 10000 });

    expect(jsErrors).toEqual([]);
  });

  test('2. 初始世界视图截图（相机默认俯视）', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('slg-initial-view.png', { maxDiffPixels: 200 });
  });

  test('3. 相机缩放到最近单位视图', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(300);

    // 通过 API 调整相机到近景
    await page.evaluate(() => {
      const cam = (window as any).__game?.camera;
      if (cam) {
        cam.distance = 30;
        cam.theta = Math.PI * 0.25;
        cam.phi = 0.8;
      }
    });
    await page.waitForTimeout(300);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('slg-zoom-unit-view.png', { maxDiffPixels: 200 });
  });

  test('4. 框选单位后显示选中高亮', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(300);

    // 通过 API 触发框选（选中视口中间的我方单位）
    await page.evaluate(() => {
      const game = (window as any).__game;
      if (game?.selectionSystem && game?.camera) {
        game.selectionSystem.boxSelect(
          { x0: -0.8, y0: -0.8, x1: 0.8, y1: 0.8 },
          game.camera,
        );
      }
    });
    await page.waitForTimeout(300);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('slg-selection-highlight.png', { maxDiffPixels: 200 });
  });

  test('5. 采集中 + HUD 资源变化', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]');

    // 等待几秒让采集循环运行
    await page.waitForTimeout(3000);

    // 断言单位正在移动（采集循环已启动）
    const movingCount = await page.evaluate(() => {
      const game = (window as any).__game;
      if (!game) return 0;
      let count = 0;
      const allyIds = game.unitManager.units
        .filter((u: any) => u.faction === 'ally')
        .slice(0, 10)
        .map((u: any) => u.id);
      for (const id of allyIds) {
        const state = game.harvestSystem.getState(id);
        if (state && state !== 'idle') count++;
      }
      return count;
    });
    // 至少有部分单位处于非 idle 状态（正在采集/移动）
    expect(movingCount).toBeGreaterThan(0);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('slg-harvesting.png', { maxDiffPixels: 200 });
  });

  test('6. 暂停菜单截图', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]');
    await page.waitForTimeout(300);

    // 通过 API 打开暂停菜单
    await page.evaluate(() => {
      const game = (window as any).__game;
      game?.pauseMenu?.show();
    });
    await page.waitForTimeout(200);

    // 断言菜单已打开
    const menuVisible = await page.evaluate(() => {
      return !!(window as any).__game?.pauseMenu?.visible;
    });
    expect(menuVisible).toBe(true);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('slg-pause-menu.png', { maxDiffPixels: 200 });
  });

  test('window.__game 暴露正确的游戏状态接口', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('canvas[data-ready="1"]');

    const gameState = await page.evaluate(() => {
      const game = (window as any).__game;
      if (!game) return null;
      return {
        frameCount: game.frameCount,
        unitCount: game.unitManager?.units?.length,
        nodeCount: game.resourceNodes?.length,
        hasCamera: !!game.camera,
        hasResourceState: !!game.resourceState,
        hasHarvestSystem: !!game.harvestSystem,
        hasPauseMenu: !!game.pauseMenu,
      };
    });

    expect(gameState).not.toBeNull();
    expect(gameState!.unitCount).toBe(120);
    expect(gameState!.nodeCount).toBeGreaterThanOrEqual(5);
    expect(gameState!.hasCamera).toBe(true);
    expect(gameState!.hasResourceState).toBe(true);
    expect(gameState!.hasHarvestSystem).toBe(true);
    expect(gameState!.hasPauseMenu).toBe(true);
  });
});
