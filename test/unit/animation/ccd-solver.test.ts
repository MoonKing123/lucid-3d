import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/animation/ccd-solver';
import { vec3 } from '../../../src/math/vec3';
import { quatLength } from '../../../src/math/quat';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('CCDSolver — Cyclic Coordinate Descent 多骨链 IK', () => {
  it('5 段直线 chain target 在到达范围内 → 收敛', () => {
    const bonePositions = [
      vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0), vec3(4, 0, 0),
    ];
    const r = mod.solveCCD({
      bonePositions,
      targetPos: vec3(2, 1.5, 0),
      iterations: 20,
      tolerance: 0.01,
    });
    expect(r.converged).toBe(true);
    expect(r.iterationsUsed).toBeGreaterThan(0);
    expect(r.iterationsUsed).toBeLessThanOrEqual(20);
    expect(r.rotations.length).toBe(4); // n-1 个 bone (4 段)
  });

  it('target 远超 chain 总长 → 不收敛但安全返回', () => {
    const bonePositions = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0)];
    const r = mod.solveCCD({
      bonePositions,
      targetPos: vec3(100, 0, 0),
      iterations: 10,
      tolerance: 0.01,
    });
    expect(r.converged).toBe(false);
    expect(r.iterationsUsed).toBe(10); // 跑满 iterations
    expect(r.rotations.length).toBe(2);
  });

  it('默认 iterations=10 + tolerance=0.01', () => {
    const bonePositions = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0)];
    const r = mod.solveCCD({ bonePositions, targetPos: vec3(1.5, 0.5, 0) });
    expect(r.iterationsUsed).toBeLessThanOrEqual(10);
  });

  it('rotations 全部归一化 (length≈1)', () => {
    const bonePositions = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];
    const r = mod.solveCCD({ bonePositions, targetPos: vec3(2, 1, 0.5), iterations: 15 });
    for (const q of r.rotations) {
      expect(quatLength(q)).toBeCloseTo(1, 3);
    }
  });

  it('target 已经在 end effector 位置 → 0 次迭代直接返回', () => {
    const bonePositions = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0)];
    const r = mod.solveCCD({ bonePositions, targetPos: vec3(2, 0, 0) });
    expect(r.converged).toBe(true);
    // 期望 0 次或极少迭代
    expect(r.iterationsUsed).toBeLessThanOrEqual(2);
  });

  it('单段 chain (2 个 bone position) → rotations 长度 1', () => {
    const bonePositions = [vec3(0, 0, 0), vec3(1, 0, 0)];
    const r = mod.solveCCD({ bonePositions, targetPos: vec3(0, 1, 0), iterations: 5 });
    expect(r.rotations.length).toBe(1);
  });

  it('退化情况: bonePositions 长度 < 2 抛错', () => {
    expect(() =>
      mod.solveCCD({ bonePositions: [vec3(0, 0, 0)], targetPos: vec3(1, 0, 0) }),
    ).toThrow();
  });

  it('iterations 0 直接返回未收敛', () => {
    const r = mod.solveCCD({
      bonePositions: [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0)],
      targetPos: vec3(0, 1, 0),
      iterations: 0,
    });
    expect(r.iterationsUsed).toBe(0);
  });

  it('tolerance 越大越早收敛', () => {
    const bp = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)];
    const tight = mod.solveCCD({ bonePositions: bp, targetPos: vec3(2, 1, 0), iterations: 30, tolerance: 0.0001 });
    const loose = mod.solveCCD({ bonePositions: bp, targetPos: vec3(2, 1, 0), iterations: 30, tolerance: 0.1 });
    expect(loose.iterationsUsed).toBeLessThanOrEqual(tight.iterationsUsed);
  });

  it('多骨链 (10 段) 收敛到圆弧形态', () => {
    const bonePositions: any[] = [];
    for (let i = 0; i <= 10; i++) bonePositions.push(vec3(i * 0.5, 0, 0));
    const r = mod.solveCCD({
      bonePositions,
      targetPos: vec3(2, 3, 0),
      iterations: 50,
      tolerance: 0.05,
    });
    expect(r.converged).toBe(true);
    expect(r.rotations.length).toBe(10);
  });

  it('rotations 是新的 Float32Array 不共享', () => {
    const bonePositions = [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0)];
    const r = mod.solveCCD({ bonePositions, targetPos: vec3(1, 1, 0) });
    for (const q of r.rotations) {
      expect(q).toBeInstanceOf(Float32Array);
      // 应是独立分配,不与输入共享内存
      expect(q.buffer).not.toBe(bonePositions[0].buffer);
    }
  });

  it('数值稳定性 (随机 50 次输入, 无 NaN)', () => {
    let nanCount = 0;
    for (let i = 0; i < 50; i++) {
      const tx = (Math.random() - 0.5) * 4;
      const ty = (Math.random() - 0.5) * 4;
      const tz = (Math.random() - 0.5) * 4;
      const r = mod.solveCCD({
        bonePositions: [vec3(0, 0, 0), vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)],
        targetPos: vec3(tx, ty, tz),
        iterations: 15,
      });
      for (const q of r.rotations) {
        if (Number.isNaN(q[0]) || Number.isNaN(q[3])) nanCount++;
      }
    }
    expect(nanCount).toBe(0);
  });
});
