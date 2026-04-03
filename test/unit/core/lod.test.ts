/**
 * LOD（Level of Detail）测试
 * 验证距离阈值切换、层级排序、可见性管理。
 */
import { describe, it, expect } from 'vitest';
import * as lodMod from '../../src/core/lod';
import { Node3D } from '../../src/core/node3d';
import { vec3 } from '../../src/math/vec3';

const isStub = '__STUB__' in lodMod && (lodMod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ---------- helpers ---------- */

function createLevels() {
  const high = new Node3D('high-detail');
  const mid = new Node3D('mid-detail');
  const low = new Node3D('low-detail');
  return { high, mid, low };
}

function setupLOD() {
  const lod = new lodMod.LOD('test-lod');
  const { high, mid, low } = createLevels();
  lod.addLevel(high, 0);   // 距离 0-10: 高细节
  lod.addLevel(mid, 10);   // 距离 10-50: 中细节
  lod.addLevel(low, 50);   // 距离 50+: 低细节
  return { lod, high, mid, low };
}

/* ---------- 构造 ---------- */

describeImpl('LOD construction', () => {
  it('should extend Node3D', () => {
    const lod = new lodMod.LOD();
    expect(lod).toBeInstanceOf(Node3D);
  });

  it('should start with no levels', () => {
    const lod = new lodMod.LOD();
    expect(lod.levels).toHaveLength(0);
  });

  it('should use default name "lod"', () => {
    const lod = new lodMod.LOD();
    expect(lod.name).toBe('lod');
  });

  it('should accept custom name', () => {
    const lod = new lodMod.LOD('my-lod');
    expect(lod.name).toBe('my-lod');
  });
});

/* ---------- addLevel ---------- */

describeImpl('LOD.addLevel', () => {
  it('should add levels and keep them sorted by distance', () => {
    const lod = new lodMod.LOD();
    const a = new Node3D('a');
    const b = new Node3D('b');

    lod.addLevel(b, 20);
    lod.addLevel(a, 5);

    expect(lod.levels).toHaveLength(2);
    expect(lod.levels[0].distance).toBe(5);
    expect(lod.levels[1].distance).toBe(20);
  });

  it('should add the object as a child node', () => {
    const lod = new lodMod.LOD();
    const child = new Node3D('child');
    lod.addLevel(child, 0);
    expect(lod.children).toContain(child);
  });

  it('should return this for chaining', () => {
    const lod = new lodMod.LOD();
    const result = lod.addLevel(new Node3D(), 0);
    expect(result).toBe(lod);
  });
});

/* ---------- update ---------- */

describeImpl('LOD.update', () => {
  it('should show high detail when camera is close', () => {
    const { lod, high, mid, low } = setupLOD();
    lod.position = vec3(0, 0, 0);
    lod.update(vec3(3, 0, 0)); // 距离 3，< 10 → 高细节

    expect(high.visible).toBe(true);
    expect(mid.visible).toBe(false);
    expect(low.visible).toBe(false);
  });

  it('should show mid detail at medium distance', () => {
    const { lod, high, mid, low } = setupLOD();
    lod.position = vec3(0, 0, 0);
    lod.update(vec3(25, 0, 0)); // 距离 25，在 10-50 → 中细节

    expect(high.visible).toBe(false);
    expect(mid.visible).toBe(true);
    expect(low.visible).toBe(false);
  });

  it('should show low detail when camera is far away', () => {
    const { lod, high, mid, low } = setupLOD();
    lod.position = vec3(0, 0, 0);
    lod.update(vec3(100, 0, 0)); // 距离 100，> 50 → 低细节

    expect(high.visible).toBe(false);
    expect(mid.visible).toBe(false);
    expect(low.visible).toBe(true);
  });

  it('should update currentLevel index', () => {
    const { lod } = setupLOD();
    lod.position = vec3(0, 0, 0);

    lod.update(vec3(3, 0, 0));
    expect(lod.currentLevel).toBe(0);

    lod.update(vec3(25, 0, 0));
    expect(lod.currentLevel).toBe(1);

    lod.update(vec3(100, 0, 0));
    expect(lod.currentLevel).toBe(2);
  });

  it('should handle LOD with no levels gracefully', () => {
    const lod = new lodMod.LOD();
    expect(() => lod.update(vec3(0, 0, 0))).not.toThrow();
    expect(lod.currentLevel).toBe(-1);
  });

  it('should use world position for distance calculation', () => {
    const { lod, high, mid } = setupLOD();
    // LOD 在世界坐标 (50, 0, 0)
    lod.position = vec3(50, 0, 0);
    // 相机在 (55, 0, 0)，距离 LOD 为 5 → 高细节
    lod.update(vec3(55, 0, 0));
    expect(high.visible).toBe(true);
    expect(mid.visible).toBe(false);
  });

  it('should handle exactly-at-threshold distances', () => {
    const { lod, high, mid } = setupLOD();
    lod.position = vec3(0, 0, 0);
    // 距离恰好等于 10（mid 的阈值）→ 应切换到 mid
    lod.update(vec3(10, 0, 0));
    expect(high.visible).toBe(false);
    expect(mid.visible).toBe(true);
  });
});
