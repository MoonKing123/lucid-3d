import { describe, it, expect } from 'vitest';
import { RemoteEntityInterpolator } from '../../../src/net/interpolator';

describe('RemoteEntityInterpolator — setSnapshot + extrapolate', () => {
  it('setSnapshot 更新目标位置', () => {
    const interp = new RemoteEntityInterpolator();
    interp.setSnapshot(1, 5, 10, 15);
    expect(interp.targetX).toBe(5);
    expect(interp.targetY).toBe(10);
    expect(interp.targetZ).toBe(15);
  });

  it('setSnapshot 缓冲多个 snapshot', () => {
    const interp = new RemoteEntityInterpolator();
    interp.setSnapshot(1, 0, 0, 0);
    interp.setSnapshot(2, 1, 0, 0);
    interp.setSnapshot(3, 2, 0, 0);
    expect(interp.snapshotCount).toBe(3);
  });

  it('超过最大缓冲数时旧 snapshot 被丢弃，数量不超过 16', () => {
    const interp = new RemoteEntityInterpolator();
    for (let i = 0; i < 20; i++) {
      interp.setSnapshot(i, i, 0, 0);
    }
    expect(interp.snapshotCount).toBeLessThanOrEqual(16);
  });

  it('extrapolate 在两个 snapshot 后沿速度方向外推', () => {
    // tickRate=30，tick 0→1 表示 1/30 秒内移动 1 单位，速度 = 30 units/s
    const interp = new RemoteEntityInterpolator(10, 30);
    interp.setSnapshot(0, 0, 0, 0);
    interp.setSnapshot(1, 1, 0, 0);
    const pos = { x: 1, y: 0, z: 0 };
    interp.extrapolate(0.1, pos); // 30 units/s * 0.1s = 3 units
    expect(pos.x).toBeCloseTo(4, 1);
    expect(pos.y).toBe(0);
    expect(pos.z).toBe(0);
  });

  it('extrapolate 处理多轴速度', () => {
    const interp = new RemoteEntityInterpolator(10, 10);
    interp.setSnapshot(0, 0, 0, 0);
    interp.setSnapshot(1, 1, 2, 3); // 速度: x=10, y=20, z=30 units/s
    const pos = { x: 0, y: 0, z: 0 };
    interp.extrapolate(0.1, pos);
    expect(pos.x).toBeCloseTo(1, 5);
    expect(pos.y).toBeCloseTo(2, 5);
    expect(pos.z).toBeCloseTo(3, 5);
  });

  it('只有一个 snapshot 时 extrapolate 不移动（无速度）', () => {
    const interp = new RemoteEntityInterpolator();
    interp.setSnapshot(1, 5, 5, 5);
    const pos = { x: 5, y: 5, z: 5 };
    interp.extrapolate(1.0, pos);
    expect(pos.x).toBe(5);
    expect(pos.y).toBe(5);
    expect(pos.z).toBe(5);
  });

  it('setSnapshot 后 update 仍然有效（lerp 到目标）', () => {
    const interp = new RemoteEntityInterpolator(10);
    interp.setSnapshot(1, 10, 0, 0);
    const pos = { x: 0, y: 0, z: 0 };
    interp.update(0.1, pos);
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.x).toBeLessThan(10);
  });

  it('setSnapshot 与 setTarget 均更新 targetX/Y/Z', () => {
    const interp = new RemoteEntityInterpolator();
    interp.setTarget(1, 2, 3);
    expect(interp.targetX).toBe(1);
    interp.setSnapshot(5, 7, 8, 9);
    expect(interp.targetX).toBe(7);
    expect(interp.targetY).toBe(8);
    expect(interp.targetZ).toBe(9);
  });
});
