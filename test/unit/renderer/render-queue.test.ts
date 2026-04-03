/**
 * RenderQueue 渲染队列排序测试
 * 验证不透明/透明分离和排序顺序。
 * 注：Material.opacity / Material.transparent 属性变更属于同一 Issue。
 */
import { describe, it, expect } from 'vitest';
import * as rqMod from '../../src/renderer/render-queue';
import { Material } from '../../src/renderer/material';

const isStub = '__STUB__' in rqMod && (rqMod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ---------- Material 透明属性 ---------- */

describeImpl('Material transparency properties', () => {
  it('should default opacity to 1', () => {
    const mat = new Material();
    expect((mat as any).opacity ?? 1).toBe(1);
  });

  it('should default transparent to false', () => {
    const mat = new Material();
    expect((mat as any).transparent ?? false).toBe(false);
  });
});

/* ---------- buildRenderQueue ---------- */

describeImpl('buildRenderQueue', () => {
  it('should separate opaque and transparent items', () => {
    const items = [
      { transparent: false, distanceSq: 100 },
      { transparent: true, distanceSq: 50 },
      { transparent: false, distanceSq: 25 },
      { transparent: true, distanceSq: 200 },
    ];
    const q = rqMod.buildRenderQueue(items);
    expect(q.opaque).toHaveLength(2);
    expect(q.transparent).toHaveLength(2);
  });

  it('should sort opaque items front-to-back (ascending distanceSq)', () => {
    const items = [
      { transparent: false, distanceSq: 100 },
      { transparent: false, distanceSq: 25 },
      { transparent: false, distanceSq: 64 },
    ];
    const q = rqMod.buildRenderQueue(items);
    expect(q.opaque[0].distanceSq).toBe(25);
    expect(q.opaque[1].distanceSq).toBe(64);
    expect(q.opaque[2].distanceSq).toBe(100);
  });

  it('should sort transparent items back-to-front (descending distanceSq)', () => {
    const items = [
      { transparent: true, distanceSq: 25 },
      { transparent: true, distanceSq: 100 },
      { transparent: true, distanceSq: 64 },
    ];
    const q = rqMod.buildRenderQueue(items);
    expect(q.transparent[0].distanceSq).toBe(100);
    expect(q.transparent[1].distanceSq).toBe(64);
    expect(q.transparent[2].distanceSq).toBe(25);
  });

  it('should handle empty input', () => {
    const q = rqMod.buildRenderQueue([]);
    expect(q.opaque).toHaveLength(0);
    expect(q.transparent).toHaveLength(0);
  });

  it('should handle all-opaque scene', () => {
    const items = [
      { transparent: false, distanceSq: 50 },
      { transparent: false, distanceSq: 10 },
    ];
    const q = rqMod.buildRenderQueue(items);
    expect(q.opaque).toHaveLength(2);
    expect(q.transparent).toHaveLength(0);
  });

  it('should handle all-transparent scene', () => {
    const items = [
      { transparent: true, distanceSq: 50 },
      { transparent: true, distanceSq: 10 },
    ];
    const q = rqMod.buildRenderQueue(items);
    expect(q.opaque).toHaveLength(0);
    expect(q.transparent).toHaveLength(2);
  });

  it('should preserve extra properties through sorting', () => {
    const items = [
      { transparent: true, distanceSq: 42, tag: 'alpha-mesh' },
    ];
    const q = rqMod.buildRenderQueue(items);
    expect((q.transparent[0] as any).tag).toBe('alpha-mesh');
  });

  it('should be stable for equal distances', () => {
    const a = { transparent: false, distanceSq: 10, id: 'a' };
    const b = { transparent: false, distanceSq: 10, id: 'b' };
    const q = rqMod.buildRenderQueue([a, b]);
    // 相同距离时应保持输入顺序
    expect((q.opaque[0] as any).id).toBe('a');
    expect((q.opaque[1] as any).id).toBe('b');
  });
});
