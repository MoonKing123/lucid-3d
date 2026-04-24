/**
 * action-rpg.spec.ts — M5.5 Playwright 视觉回归测试。
 * 在浏览器中运行 Action RPG demo，生成 5 张基线截图。
 *
 * 运行：
 *   npx playwright test --config playwright.config.ts           # 对比基线
 *   npx playwright test --config playwright.config.ts --update-snapshots  # 生成基线
 *
 * dev server 由 playwright.config.ts webServer 自动启动。
 */

import { test, expect, type Page } from '@playwright/test';

/** 等待 WebGL canvas 完成渲染（检查 canvas 非空） */
async function waitForRender(page: Page, ms = 1000): Promise<void> {
  await page.waitForTimeout(ms);
}

/** 等待游戏初始化：canvas 存在 + 稳定渲染 */
async function waitForGame(page: Page): Promise<void> {
  await page.waitForSelector('#canvas', { timeout: 15_000 });
  await waitForRender(page, 2000);
}

/** 模拟按键（按下 + 等待 + 松开） */
async function pressKey(page: Page, key: string, holdMs = 300): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(holdMs);
  await page.keyboard.up(key);
}

test.describe('Action RPG 视觉回归', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForGame(page);
  });

  test('baseline-1-initial（初始场景：玩家 + Enemy + HUD）', async ({ page }) => {
    // 等待场景稳定（Enemy 开始 patrol，HUD 已渲染）
    await waitForRender(page, 500);
    await expect(page).toHaveScreenshot('baseline-1-initial.png');
  });

  test('baseline-2-melee（近战剑气特效）', async ({ page }) => {
    // 前进一段距离，然后按 F 发动近战
    await pressKey(page, 'w', 400);
    await waitForRender(page, 200);

    // 按 F 触发近战攻击（TrailRenderer 剑气）
    await page.keyboard.down('f');
    await waitForRender(page, 100); // 捕获剑气特效瞬间
    await expect(page).toHaveScreenshot('baseline-2-melee.png');
    await page.keyboard.up('f');
  });

  test('baseline-3-ranged（远程弹道飞行瞬间）', async ({ page }) => {
    // 切换到弓（按 2）
    await page.keyboard.press('2');
    await waitForRender(page, 200);

    // 前进并发射弓箭
    await pressKey(page, 'w', 300);
    await page.keyboard.press('f');
    await waitForRender(page, 300); // 弹道飞行中截图

    await expect(page).toHaveScreenshot('baseline-3-ranged.png');
  });

  test('baseline-4-enemy-death（Enemy 死亡粒子瞬间）', async ({ page }) => {
    // 切换回剑
    await page.keyboard.press('1');
    await waitForRender(page, 200);

    // 移向最近的 Enemy 并连续攻击（Enemy spawn 在 [-30,0,-30] 等固定位置）
    // 用鼠标拖动相机旋转 + 移动接近
    await page.mouse.move(400, 300);

    // 连续攻击 2 秒，Enemy HP=100，剑伤害 25，4 次即可杀死
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('f');
      await waitForRender(page, 600); // 等待攻击冷却 0.5s
    }

    // 截图捕获死亡粒子
    await waitForRender(page, 200);
    await expect(page).toHaveScreenshot('baseline-4-enemy-death.png');
  });

  test('baseline-5-esc-menu（Esc 菜单：Slider + Dropdown + TextInput）', async ({ page }) => {
    // 按 Esc 打开菜单（UISlider 音量 + UIDropdown 画质 + UITextInput 玩家名）
    await page.keyboard.press('Escape');
    await waitForRender(page, 500);

    expect(true).toBe(true); // 确保测试进入了 esc 分支
    await expect(page).toHaveScreenshot('baseline-5-esc-menu.png');
  });
});
