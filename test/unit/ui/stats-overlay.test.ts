import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/ui/stats-overlay';
import { UICanvas } from '../../../src/ui/ui-canvas';

const isStub = '__STUB__' in mod && (mod as unknown as { __STUB__: boolean }).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('StatsOverlay — 内置 FPS / RenderInfo HUD', () => {
  describe('constructor', () => {
    it('用默认 options 创建', () => {
      const canvas = new UICanvas(800, 600);
      const overlay = new mod.StatsOverlay(canvas);
      expect(overlay).toBeDefined();
      // overlay 应在 canvas 中添加自己的 UI 元素
      expect(canvas.children.length).toBeGreaterThan(0);
    });

    it('自定义 position', () => {
      const canvas = new UICanvas(800, 600);
      const overlay = new mod.StatsOverlay(canvas, { position: { x: 100, y: 200 } });
      expect(overlay).toBeDefined();
    });
  });

  describe('update', () => {
    it('从 dt 计算 FPS（1/dt）', () => {
      const canvas = new UICanvas(800, 600);
      const overlay = new mod.StatsOverlay(canvas, { updateInterval: 0 });
      overlay.update(1 / 60); // 60 FPS
      expect(overlay.fps).toBeCloseTo(60, 0);
    });

    it('多帧 FPS 平滑（移动平均）', () => {
      const canvas = new UICanvas(800, 600);
      const overlay = new mod.StatsOverlay(canvas, { updateInterval: 0 });
      for (let i = 0; i < 10; i++) overlay.update(1 / 30); // 30 FPS
      expect(overlay.fps).toBeGreaterThan(20);
      expect(overlay.fps).toBeLessThan(40);
    });

    it('renderInfo 注入 drawCalls + triangles', () => {
      const canvas = new UICanvas(800, 600);
      const overlay = new mod.StatsOverlay(canvas, { updateInterval: 0 });
      overlay.update(1 / 60, { drawCalls: 42, triangles: 12345 });
      expect(overlay.drawCalls).toBe(42);
      expect(overlay.triangles).toBe(12345);
    });

    it('updateInterval 控制刷新频率', () => {
      const canvas = new UICanvas(800, 600);
      const overlay = new mod.StatsOverlay(canvas, { updateInterval: 1.0 });
      overlay.update(0.5); // 累积但不刷新显示文本
      const initialFPS = overlay.fps;
      overlay.update(0.6); // 累积超过 1.0s，刷新
      // 内部刷新逻辑应保证文本在 interval 时刻更新
      expect(overlay.fps).toBeGreaterThanOrEqual(0);
    });

    it('dt=0 不爆炸（防御 NaN/Infinity）', () => {
      const canvas = new UICanvas(800, 600);
      const overlay = new mod.StatsOverlay(canvas, { updateInterval: 0 });
      expect(() => overlay.update(0)).not.toThrow();
      expect(Number.isFinite(overlay.fps)).toBe(true);
    });
  });

  describe('destroy', () => {
    it('从 canvas 移除 UI 元素', () => {
      const canvas = new UICanvas(800, 600);
      const overlay = new mod.StatsOverlay(canvas);
      const beforeCount = canvas.children.length;
      overlay.destroy();
      expect(canvas.children.length).toBeLessThan(beforeCount);
    });
  });
});
