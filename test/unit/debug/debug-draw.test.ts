import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/debug/debug-draw';

const isStub = '__STUB__' in mod && (mod as unknown as { __STUB__: boolean }).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('DebugDraw — immediate-mode 调试绘制', () => {
  describe('constructor', () => {
    it('初始化时所有 buffer 为空', () => {
      const dd = new mod.DebugDraw();
      expect(dd.getLines()).toEqual([]);
      expect(dd.getSpheres()).toEqual([]);
      expect(dd.getBoxes()).toEqual([]);
      expect(dd.getArrows()).toEqual([]);
      expect(dd.count).toBe(0);
    });
  });

  describe('drawLine', () => {
    it('累积一条线段', () => {
      const dd = new mod.DebugDraw();
      dd.drawLine([0, 0, 0], [1, 1, 1], [1, 0, 0], 2);
      const lines = dd.getLines();
      expect(lines.length).toBe(1);
      expect(lines[0]?.start).toEqual([0, 0, 0]);
      expect(lines[0]?.end).toEqual([1, 1, 1]);
      expect(lines[0]?.color).toEqual([1, 0, 0]);
      expect(lines[0]?.thickness).toBe(2);
    });

    it('color 默认为白色 [1,1,1]', () => {
      const dd = new mod.DebugDraw();
      dd.drawLine([0, 0, 0], [1, 0, 0]);
      expect(dd.getLines()[0]?.color).toEqual([1, 1, 1]);
    });

    it('thickness 默认 1', () => {
      const dd = new mod.DebugDraw();
      dd.drawLine([0, 0, 0], [1, 0, 0]);
      expect(dd.getLines()[0]?.thickness).toBe(1);
    });

    it('累积多条线段', () => {
      const dd = new mod.DebugDraw();
      dd.drawLine([0, 0, 0], [1, 0, 0]);
      dd.drawLine([0, 0, 0], [0, 1, 0]);
      dd.drawLine([0, 0, 0], [0, 0, 1]);
      expect(dd.getLines().length).toBe(3);
    });
  });

  describe('drawSphere', () => {
    it('累积一个 sphere', () => {
      const dd = new mod.DebugDraw();
      dd.drawSphere([1, 2, 3], 0.5, [0, 1, 0], 24);
      const sps = dd.getSpheres();
      expect(sps.length).toBe(1);
      expect(sps[0]?.center).toEqual([1, 2, 3]);
      expect(sps[0]?.radius).toBe(0.5);
      expect(sps[0]?.color).toEqual([0, 1, 0]);
      expect(sps[0]?.segments).toBe(24);
    });

    it('segments 默认 16', () => {
      const dd = new mod.DebugDraw();
      dd.drawSphere([0, 0, 0], 1);
      expect(dd.getSpheres()[0]?.segments).toBe(16);
    });

    it('radius <= 0 抛错', () => {
      const dd = new mod.DebugDraw();
      expect(() => dd.drawSphere([0, 0, 0], 0)).toThrow();
      expect(() => dd.drawSphere([0, 0, 0], -1)).toThrow();
    });
  });

  describe('drawBox', () => {
    it('累积一个 AABB box', () => {
      const dd = new mod.DebugDraw();
      dd.drawBox([-1, -1, -1], [1, 1, 1], [0, 0, 1]);
      const boxes = dd.getBoxes();
      expect(boxes.length).toBe(1);
      expect(boxes[0]?.min).toEqual([-1, -1, -1]);
      expect(boxes[0]?.max).toEqual([1, 1, 1]);
      expect(boxes[0]?.color).toEqual([0, 0, 1]);
    });
  });

  describe('drawArrow', () => {
    it('累积一个箭头', () => {
      const dd = new mod.DebugDraw();
      dd.drawArrow([0, 0, 0], [1, 0, 0], 2, [1, 1, 0], 0.3);
      const arrows = dd.getArrows();
      expect(arrows.length).toBe(1);
      expect(arrows[0]?.origin).toEqual([0, 0, 0]);
      expect(arrows[0]?.direction).toEqual([1, 0, 0]);
      expect(arrows[0]?.length).toBe(2);
      expect(arrows[0]?.headSize).toBe(0.3);
    });

    it('headSize 默认基于 length 的比例 (0.2 * length)', () => {
      const dd = new mod.DebugDraw();
      dd.drawArrow([0, 0, 0], [1, 0, 0], 5);
      expect(dd.getArrows()[0]?.headSize).toBeCloseTo(1.0, 4);
    });
  });

  describe('count + flush', () => {
    it('count 是所有 buffer 总和', () => {
      const dd = new mod.DebugDraw();
      dd.drawLine([0, 0, 0], [1, 0, 0]);
      dd.drawSphere([0, 0, 0], 1);
      dd.drawBox([0, 0, 0], [1, 1, 1]);
      dd.drawArrow([0, 0, 0], [1, 0, 0], 1);
      expect(dd.count).toBe(4);
    });

    it('flush 清空所有 buffer', () => {
      const dd = new mod.DebugDraw();
      dd.drawLine([0, 0, 0], [1, 0, 0]);
      dd.drawSphere([0, 0, 0], 1);
      dd.flush();
      expect(dd.count).toBe(0);
      expect(dd.getLines()).toEqual([]);
      expect(dd.getSpheres()).toEqual([]);
    });

    it('flush 后可继续 draw', () => {
      const dd = new mod.DebugDraw();
      dd.drawLine([0, 0, 0], [1, 0, 0]);
      dd.flush();
      dd.drawLine([0, 0, 0], [0, 1, 0]);
      expect(dd.count).toBe(1);
      expect(dd.getLines().length).toBe(1);
    });
  });
});
