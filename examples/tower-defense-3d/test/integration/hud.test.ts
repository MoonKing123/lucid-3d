import { describe, it, expect } from 'vitest';
import { HUD } from '../../src/hud';
import { TowerPalette } from '../../src/tower-palette';
import { GameOverMenu } from '../../src/game-over-menu';

describe('HUD — 游戏 UI', () => {
  it('初始化后含 gold/wave/lives 文本元素', () => {
    const hud = new HUD({ width: 800, height: 600, maxLives: 20 });
    expect(hud.canvas).toBeDefined();
    expect(hud.gold).toBe(0);
    expect(hud.wave).toBe(0);
  });

  it('setGold 正确更新内部值', () => {
    const hud = new HUD({ width: 800, height: 600, maxLives: 20 });
    hud.setGold(150);
    expect(hud.gold).toBe(150);
  });

  it('setLives 同步进度条', () => {
    const hud = new HUD({ width: 800, height: 600, maxLives: 20 });
    hud.setLives(15);
    expect(hud.lives).toBe(15);
    expect(hud.livesBar.value).toBe(15);
  });
});

describe('TowerPalette — 塔选择面板', () => {
  it('默认选中 arrow', () => {
    const palette = new TowerPalette({ x: 0, y: 0 });
    expect(palette.selectedType).toBe('arrow');
  });

  it('select cannon 后 selectedType 变化并触发回调', () => {
    const palette = new TowerPalette({ x: 0, y: 0 });
    let received: string | null = null;
    palette.onSelect = (t) => { received = t; };
    palette.select('cannon');
    expect(palette.selectedType).toBe('cannon');
    expect(received).toBe('cannon');
  });
});

describe('GameOverMenu — Game Over 覆盖层', () => {
  it('默认 hidden', () => {
    const menu = new GameOverMenu({ width: 800, height: 600 });
    expect(menu.visible).toBe(false);
  });

  it('show/hide 切换可见性', () => {
    const menu = new GameOverMenu({ width: 800, height: 600 });
    menu.show();
    expect(menu.visible).toBe(true);
    menu.hide();
    expect(menu.visible).toBe(false);
  });

  it('点击 restart 触发 onRestart 回调', () => {
    const menu = new GameOverMenu({ width: 800, height: 600 });
    let restarted = false;
    menu.onRestart = () => { restarted = true; };
    menu.restartBtn.onClick?.();
    expect(restarted).toBe(true);
  });
});
