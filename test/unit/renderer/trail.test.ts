/**
 * TrailRenderer 单元测试 — 动态拖尾效果。
 * Architect 预写测试，Dev 实现 src/renderer/trail.ts 后全部通过。
 *
 * 测试覆盖：
 * 1. 类结构 & 默认值
 * 2. update() 采样与老化
 * 3. reset() 清除
 * 4. getPositions() 几何生成
 * 5. getColors() 颜色渐变
 * 6. maxPoints 环形缓冲区限制
 * 7. 静止时不产生退化几何
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/trail';
import { Node3D } from '../../../src/core/node3d';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ── helper: create a trail attached to a moving parent ── */

function makeTrailWithParent(opts?: mod.TrailRendererOptions) {
  const parent = new Node3D('mover');
  const trail = new mod.TrailRenderer(opts);
  parent.addChild(trail);
  return { parent, trail };
}

/* ───────────── Class structure ───────────── */

describeImpl('TrailRenderer — class structure', () => {
  it('should extend Node3D', () => {
    const trail = new mod.TrailRenderer();
    expect(trail).toBeInstanceOf(Node3D);
  });

  it('should have correct defaults', () => {
    const trail = new mod.TrailRenderer();
    expect(trail.width).toBe(0.5);
    expect(trail.lifetime).toBe(1.0);
    expect(trail.maxPoints).toBe(64);
  });

  it('should accept custom options', () => {
    const trail = new mod.TrailRenderer({
      width: 0.3,
      lifetime: 2.0,
      maxPoints: 128,
      color: vec3(1, 0, 0),
      colorEnd: vec3(0, 0, 1),
    });
    expect(trail.width).toBe(0.3);
    expect(trail.lifetime).toBe(2.0);
    expect(trail.maxPoints).toBe(128);
    expect(trail.color[0]).toBeCloseTo(1);
    expect(trail.colorEnd[2]).toBeCloseTo(1);
  });
});

/* ───────────── update — sampling & aging ───────────── */

describeImpl('TrailRenderer — update', () => {
  it('should add trail points when parent moves', () => {
    const { parent, trail } = makeTrailWithParent();
    parent.position = vec3(0, 0, 0);
    trail.update(0.016);
    parent.position = vec3(1, 0, 0);
    trail.update(0.016);
    parent.position = vec3(2, 0, 0);
    trail.update(0.016);
    expect(trail.trailPoints.length).toBeGreaterThanOrEqual(3);
  });

  it('should age and remove points after lifetime expires', () => {
    const { parent, trail } = makeTrailWithParent({ lifetime: 0.1 });
    parent.position = vec3(0, 0, 0);
    trail.update(0.016);
    parent.position = vec3(1, 0, 0);
    trail.update(0.016);

    // Advance time past lifetime
    trail.update(0.2);
    // Old points should have been removed
    expect(trail.trailPoints.every(p => p.age <= 0.1 + 0.01)).toBe(true);
  });
});

/* ───────────── reset ───────────── */

describeImpl('TrailRenderer — reset', () => {
  it('should clear all trail points', () => {
    const { parent, trail } = makeTrailWithParent();
    parent.position = vec3(0, 0, 0);
    trail.update(0.016);
    parent.position = vec3(1, 0, 0);
    trail.update(0.016);
    expect(trail.trailPoints.length).toBeGreaterThan(0);

    trail.reset();
    expect(trail.trailPoints.length).toBe(0);
  });
});

/* ───────────── getPositions — geometry ───────────── */

describeImpl('TrailRenderer — getPositions', () => {
  it('should return Float32Array of positions', () => {
    const { parent, trail } = makeTrailWithParent();
    parent.position = vec3(0, 0, 0);
    trail.update(0.016);
    parent.position = vec3(1, 0, 0);
    trail.update(0.016);
    parent.position = vec3(2, 0, 0);
    trail.update(0.016);

    const positions = trail.getPositions();
    expect(positions).toBeInstanceOf(Float32Array);
    // At least 2 trail points → at least 1 quad → 6 vertices × 3 components
    expect(positions.length).toBeGreaterThanOrEqual(6);
    // Length should be multiple of 3 (xyz components)
    expect(positions.length % 3).toBe(0);
  });

  it('should return empty array when no trail points', () => {
    const trail = new mod.TrailRenderer();
    const positions = trail.getPositions();
    expect(positions.length).toBe(0);
  });
});

/* ───────────── getColors — gradient ───────────── */

describeImpl('TrailRenderer — getColors', () => {
  it('should return Float32Array of RGB colors', () => {
    const { parent, trail } = makeTrailWithParent({
      color: vec3(1, 0, 0),
      colorEnd: vec3(0, 0, 1),
    });
    parent.position = vec3(0, 0, 0);
    trail.update(0.016);
    parent.position = vec3(1, 0, 0);
    trail.update(0.016);
    parent.position = vec3(2, 0, 0);
    trail.update(0.016);

    const colors = trail.getColors();
    expect(colors).toBeInstanceOf(Float32Array);
    // Each vertex has 3 color components (RGB)
    expect(colors.length % 3).toBe(0);
    // Color values should be in [0, 1] range
    for (let i = 0; i < colors.length; i++) {
      expect(colors[i]).toBeGreaterThanOrEqual(0);
      expect(colors[i]).toBeLessThanOrEqual(1);
    }
  });
});

/* ───────────── maxPoints ring buffer ───────────── */

describeImpl('TrailRenderer — maxPoints limit', () => {
  it('should not exceed maxPoints trail points', () => {
    const { parent, trail } = makeTrailWithParent({ maxPoints: 4, lifetime: 10 });
    for (let i = 0; i < 10; i++) {
      parent.position = vec3(i, 0, 0);
      trail.update(0.016);
    }
    expect(trail.trailPoints.length).toBeLessThanOrEqual(4);
  });
});

/* ───────────── Stationary — no degenerate geometry ───────────── */

describeImpl('TrailRenderer — stationary object', () => {
  it('should not accumulate duplicate points when parent is stationary', () => {
    const { parent, trail } = makeTrailWithParent();
    parent.position = vec3(5, 0, 0);
    trail.update(0.016);
    trail.update(0.016);
    trail.update(0.016);
    trail.update(0.016);
    // Should not have 4 identical points — either 1 point or deduplicated
    const uniquePositions = new Set(
      trail.trailPoints.map(p => `${p.position[0].toFixed(4)},${p.position[1].toFixed(4)},${p.position[2].toFixed(4)}`)
    );
    expect(uniquePositions.size).toBeLessThanOrEqual(1);
  });
});
