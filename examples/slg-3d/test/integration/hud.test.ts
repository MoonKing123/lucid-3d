/**
 * 集成测试：M3.5 SLG HUD
 *
 * 验收标准：
 * - 资源栏响应资源变更（从 0 → 500 可见递增）
 * - 小地图点位置与世界空间单位位置一致
 * - 选中单位后信息面板显示正确数量
 * - 暂停菜单按钮可点击并响应
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceBar } from '../../src/hud/resource-bar';
import { Minimap } from '../../src/hud/minimap';
import { UnitPanel } from '../../src/hud/unit-panel';
import { CommandFeedback } from '../../src/hud/command-feedback';
import { PauseMenu } from '../../src/hud/pause-menu';
import { UnitManager, TOTAL_UNITS } from '../../src/units';
import { TERRAIN_SIZE } from '../../src/terrain';

// ────────────────────────────────────────────────────────────
// ResourceBar — 资源计数栏
// ────────────────────────────────────────────────────────────
describe('ResourceBar — 资源计数栏', () => {
  it('初始化后 gold=0, wood=0', () => {
    const bar = new ResourceBar({ width: 800, height: 600 });
    expect(bar.canvas).toBeDefined();
    expect(bar.gold).toBe(0);
    expect(bar.wood).toBe(0);
  });

  it('setGold 正确更新内部值', () => {
    const bar = new ResourceBar({ width: 800, height: 600 });
    bar.setGold(150);
    expect(bar.gold).toBe(150);
  });

  it('setWood 正确更新内部值', () => {
    const bar = new ResourceBar({ width: 800, height: 600 });
    bar.setWood(300);
    expect(bar.wood).toBe(300);
  });

  it('资源栏从 0 → 500 递增更新金资源', () => {
    const bar = new ResourceBar({ width: 800, height: 600 });
    const steps = [0, 100, 200, 300, 400, 500];
    for (const v of steps) {
      bar.setGold(v);
      expect(bar.gold).toBe(v);
    }
    expect(bar.gold).toBe(500);
  });

  it('goldText 文本随 setGold 更新', () => {
    const bar = new ResourceBar({ width: 800, height: 600 });
    bar.setGold(250);
    expect(bar.goldText.text).toContain('250');
  });

  it('woodText 文本随 setWood 更新', () => {
    const bar = new ResourceBar({ width: 800, height: 600 });
    bar.setWood(75);
    expect(bar.woodText.text).toContain('75');
  });

  it('canvas 包含 background + goldText + woodText 共 3 个子元素', () => {
    const bar = new ResourceBar({ width: 800, height: 600 });
    expect(bar.canvas.children.length).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────
// Minimap — 小地图
// ────────────────────────────────────────────────────────────
describe('Minimap — 小地图', () => {
  it('创建 Minimap 后有 background，尺寸正确', () => {
    const minimap = new Minimap({ x: 600, y: 16, size: 200, worldSize: TERRAIN_SIZE });
    expect(minimap.background).toBeDefined();
    expect(minimap.background.width).toBe(200);
    expect(minimap.background.height).toBe(200);
  });

  it('世界坐标 (0, 0) 映射到小地图中心 (100, 100)', () => {
    const minimap = new Minimap({ x: 0, y: 0, size: 200, worldSize: 128 });
    const pos = minimap.worldToMap(0, 0);
    expect(pos.x).toBeCloseTo(100, 1);
    expect(pos.y).toBeCloseTo(100, 1);
  });

  it('世界坐标左上角 (-64, -64) 映射到小地图 (0, 0)', () => {
    const minimap = new Minimap({ x: 0, y: 0, size: 200, worldSize: 128 });
    const pos = minimap.worldToMap(-64, -64);
    expect(pos.x).toBeCloseTo(0, 1);
    expect(pos.y).toBeCloseTo(0, 1);
  });

  it('世界坐标右下角 (64, 64) 映射到小地图 (200, 200)', () => {
    const minimap = new Minimap({ x: 0, y: 0, size: 200, worldSize: 128 });
    const pos = minimap.worldToMap(64, 64);
    expect(pos.x).toBeCloseTo(200, 1);
    expect(pos.y).toBeCloseTo(200, 1);
  });

  it('update 后 dots 数组长度等于单位总数', () => {
    const um = new UnitManager();
    const minimap = new Minimap({ x: 0, y: 0, size: 200, worldSize: TERRAIN_SIZE });
    minimap.update(um.units);
    expect(minimap.dots.length).toBe(TOTAL_UNITS);
  });

  it('单位点位置与世界坐标一致（通过 worldToMap 验证）', () => {
    const um = new UnitManager();
    const minimap = new Minimap({ x: 0, y: 0, size: 200, worldSize: TERRAIN_SIZE });
    minimap.update(um.units);

    // 取前 5 个单位验证坐标一致性
    for (let i = 0; i < 5; i++) {
      const unit = um.units[i];
      const expected = minimap.worldToMap(unit.x, unit.z);
      const dot = minimap.dots.find(d => d.unitId === unit.id)!;
      expect(dot).toBeDefined();
      expect(dot.x).toBeCloseTo(expected.x, 4);
      expect(dot.y).toBeCloseTo(expected.y, 4);
    }
  });

  it('我方单位点颜色为蓝色（B > 0.5）', () => {
    const um = new UnitManager();
    const minimap = new Minimap({ x: 0, y: 0, size: 200, worldSize: TERRAIN_SIZE });
    minimap.update(um.units);
    const allyUnit = um.units.find(u => u.faction === 'ally')!;
    const allyDot = minimap.dots.find(d => d.unitId === allyUnit.id)!;
    expect(allyDot.color[2]).toBeGreaterThan(0.5);
  });

  it('敌方单位点颜色为红色（R > 0.5）', () => {
    const um = new UnitManager();
    const minimap = new Minimap({ x: 0, y: 0, size: 200, worldSize: TERRAIN_SIZE });
    minimap.update(um.units);
    const enemyUnit = um.units.find(u => u.faction === 'enemy')!;
    const enemyDot = minimap.dots.find(d => d.unitId === enemyUnit.id)!;
    expect(enemyDot.color[0]).toBeGreaterThan(0.5);
    expect(enemyDot.color[2]).toBeLessThan(0.5);
  });

  it('选中单位点颜色变为高亮黄（R≈1, G≈1）', () => {
    const um = new UnitManager();
    const minimap = new Minimap({ x: 0, y: 0, size: 200, worldSize: TERRAIN_SIZE });
    const allyUnit = um.units.find(u => u.faction === 'ally')!;
    // 模拟选中
    um.setSelected(allyUnit.id, true);
    minimap.update(um.units);
    const dot = minimap.dots.find(d => d.unitId === allyUnit.id)!;
    expect(dot.color[0]).toBeGreaterThan(0.9); // R
    expect(dot.color[1]).toBeGreaterThan(0.9); // G
  });
});

// ────────────────────────────────────────────────────────────
// UnitPanel — 选中单位信息面板
// ────────────────────────────────────────────────────────────
describe('UnitPanel — 选中单位信息面板', () => {
  let um: UnitManager;

  beforeEach(() => {
    um = new UnitManager();
  });

  it('初始化后 selectedCount 为 0', () => {
    const panel = new UnitPanel({ width: 800, height: 600 });
    expect(panel.selectedCount).toBe(0);
  });

  it('update 空选中后 selectedCount=0', () => {
    const panel = new UnitPanel({ width: 800, height: 600 });
    panel.update(new Set(), um.units);
    expect(panel.selectedCount).toBe(0);
  });

  it('update 选中 5 个单位后 selectedCount=5', () => {
    const panel = new UnitPanel({ width: 800, height: 600 });
    const allyIds = um.units.filter(u => u.faction === 'ally').slice(0, 5).map(u => u.id);
    panel.update(new Set(allyIds), um.units);
    expect(panel.selectedCount).toBe(5);
  });

  it('countText 文本包含选中数量', () => {
    const panel = new UnitPanel({ width: 800, height: 600 });
    const ids = um.units.slice(0, 3).map(u => u.id);
    panel.update(new Set(ids), um.units);
    expect(panel.countText.text).toContain('3');
  });

  it('阵营分布文本正确（全选我方 3 个）', () => {
    const panel = new UnitPanel({ width: 800, height: 600 });
    const allyIds = um.units.filter(u => u.faction === 'ally').slice(0, 3).map(u => u.id);
    panel.update(new Set(allyIds), um.units);
    expect(panel.allyText.text).toContain('3');
    expect(panel.enemyText.text).toContain('0');
    expect(panel.neutralText.text).toContain('0');
  });

  it('UIFlexContainer 包含 4 个文本子元素', () => {
    const panel = new UnitPanel({ width: 800, height: 600 });
    expect(panel.container.children.length).toBe(4);
  });
});

// ────────────────────────────────────────────────────────────
// CommandFeedback — 命令反馈
// ────────────────────────────────────────────────────────────
describe('CommandFeedback — 命令反馈', () => {
  it('初始 isActive 为 false', () => {
    const cf = new CommandFeedback();
    expect(cf.isActive).toBe(false);
  });

  it('初始 marker 不可见', () => {
    const cf = new CommandFeedback();
    expect(cf.marker.visible).toBe(false);
  });

  it('show 后 isActive 为 true', () => {
    const cf = new CommandFeedback();
    cf.show(100, 100);
    expect(cf.isActive).toBe(true);
  });

  it('show 后 marker 可见且位置正确', () => {
    const cf = new CommandFeedback();
    cf.show(200, 150);
    expect(cf.marker.visible).toBe(true);
    // 标记居中在点击位置（marker x = 200 - size/2）
    expect(cf.marker.x).toBeCloseTo(200 - 10, 0);
    expect(cf.marker.y).toBeCloseTo(150 - 10, 0);
  });

  it('show 后 opacity 为 1', () => {
    const cf = new CommandFeedback();
    cf.show(100, 100);
    expect(cf.marker.opacity).toBeCloseTo(1.0, 4);
  });

  it('update(0.25) 后 opacity 约为 0.5（淡出一半）', () => {
    const cf = new CommandFeedback();
    cf.show(100, 100);
    cf.update(0.25);
    expect(cf.marker.opacity).toBeCloseTo(0.5, 1);
  });

  it('update 超过 0.5s 后 isActive 变 false', () => {
    const cf = new CommandFeedback();
    cf.show(100, 100);
    cf.update(0.6);
    expect(cf.isActive).toBe(false);
  });

  it('update 超过 0.5s 后 marker 不可见', () => {
    const cf = new CommandFeedback();
    cf.show(100, 100);
    cf.update(0.6);
    expect(cf.marker.visible).toBe(false);
  });

  it('未激活时 update 不报错', () => {
    const cf = new CommandFeedback();
    expect(() => cf.update(1.0)).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────
// PauseMenu — 暂停菜单
// ────────────────────────────────────────────────────────────
describe('PauseMenu — 暂停菜单', () => {
  it('默认 hidden（visible=false）', () => {
    const menu = new PauseMenu({ width: 800, height: 600 });
    expect(menu.visible).toBe(false);
  });

  it('show() 后 visible=true', () => {
    const menu = new PauseMenu({ width: 800, height: 600 });
    menu.show();
    expect(menu.visible).toBe(true);
  });

  it('hide() 后 visible=false', () => {
    const menu = new PauseMenu({ width: 800, height: 600 });
    menu.show();
    menu.hide();
    expect(menu.visible).toBe(false);
  });

  it('toggle() 切换可见性', () => {
    const menu = new PauseMenu({ width: 800, height: 600 });
    menu.toggle();
    expect(menu.visible).toBe(true);
    menu.toggle();
    expect(menu.visible).toBe(false);
  });

  it('Resume 按钮 onClick 触发 onResume 回调', () => {
    const menu = new PauseMenu({ width: 800, height: 600 });
    let resumed = false;
    menu.onResume = () => { resumed = true; };
    menu.resumeBtn.onClick?.();
    expect(resumed).toBe(true);
  });

  it('Restart 按钮 onClick 触发 onRestart 回调', () => {
    const menu = new PauseMenu({ width: 800, height: 600 });
    let restarted = false;
    menu.onRestart = () => { restarted = true; };
    menu.restartBtn.onClick?.();
    expect(restarted).toBe(true);
  });

  it('Back to Menu 按钮 onClick 触发 onBackToMenu 回调', () => {
    const menu = new PauseMenu({ width: 800, height: 600 });
    let backedOut = false;
    menu.onBackToMenu = () => { backedOut = true; };
    menu.backToMenuBtn.onClick?.();
    expect(backedOut).toBe(true);
  });

  it('canvas 包含 overlay + title + buttonContainer 共 3 个子元素', () => {
    const menu = new PauseMenu({ width: 800, height: 600 });
    expect(menu.canvas.children.length).toBe(3);
  });

  it('buttonContainer 包含 3 个按钮', () => {
    const menu = new PauseMenu({ width: 800, height: 600 });
    expect(menu.buttonContainer.children.length).toBe(3);
  });
});
