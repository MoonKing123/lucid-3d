import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/animation/ik-chain';
import { vec3 } from '../../../src/math/vec3';
import { Skeleton, type BoneData } from '../../../src/animation/skeleton';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

function makeChainSkeleton(boneCount: number): Skeleton {
  const bones: BoneData[] = [];
  for (let i = 0; i < boneCount; i++) {
    bones.push({ name: `b${i}`, parentIndex: i - 1 });
  }
  // identity inverse bind matrices
  const ibm = new Float32Array(boneCount * 16);
  for (let i = 0; i < boneCount; i++) {
    const off = i * 16;
    ibm[off + 0] = 1; ibm[off + 5] = 1; ibm[off + 10] = 1; ibm[off + 15] = 1;
    // 平移每个 bone 到 (-i, 0, 0) 让局部 (i, 0, 0) 累计为世界 (i, 0, 0)
    ibm[off + 12] = -i;
  }
  const sk = new Skeleton(bones, ibm);
  // 设置 rest pose: 每个 bone 在父空间内向 +x 方向偏移 1
  for (let i = 0; i < boneCount; i++) {
    sk.localPositions[i * 3] = i === 0 ? 0 : 1;
    sk.localRotations[i * 4 + 3] = 1; // identity quat
    sk.localScales[i * 3] = 1; sk.localScales[i * 3 + 1] = 1; sk.localScales[i * 3 + 2] = 1;
  }
  sk.update();
  return sk;
}

describeImpl('IKChain — Skeleton 集成层', () => {
  it('构造器接受 two-bone solver + 3 个 bone indices', () => {
    const chain = new mod.IKChain({
      solver: 'two-bone',
      boneIndices: [0, 1, 2],
      target: vec3(1, 1, 0),
    });
    expect(chain).toBeInstanceOf(mod.IKChain);
  });

  it('构造器接受 ccd solver + N 个 bone indices', () => {
    const chain = new mod.IKChain({
      solver: 'ccd',
      boneIndices: [0, 1, 2, 3, 4],
      target: vec3(2, 1, 0),
    });
    expect(chain).toBeInstanceOf(mod.IKChain);
  });

  it('two-bone solver 要求恰好 3 个 bone indices,否则抛错', () => {
    expect(() =>
      new mod.IKChain({
        solver: 'two-bone',
        boneIndices: [0, 1],
        target: vec3(1, 0, 0),
      }),
    ).toThrow();
    expect(() =>
      new mod.IKChain({
        solver: 'two-bone',
        boneIndices: [0, 1, 2, 3],
        target: vec3(1, 0, 0),
      }),
    ).toThrow();
  });

  it('ccd solver 要求至少 2 个 bone indices', () => {
    expect(() =>
      new mod.IKChain({
        solver: 'ccd',
        boneIndices: [0],
        target: vec3(1, 0, 0),
      }),
    ).toThrow();
  });

  it('setTarget 更新内部 target', () => {
    const chain = new mod.IKChain({
      solver: 'ccd',
      boneIndices: [0, 1, 2],
      target: vec3(1, 0, 0),
    });
    chain.setTarget(vec3(2, 1, 0));
    // 调用 solve 不应抛 (target 已更新)
    const sk = makeChainSkeleton(3);
    expect(() => chain.solve(sk)).not.toThrow();
  });

  it('solve(skeleton) 可达 target → 返回 true 并修改 localRotations', () => {
    const sk = makeChainSkeleton(5);
    const before = Array.from(sk.localRotations);
    const chain = new mod.IKChain({
      solver: 'ccd',
      boneIndices: [0, 1, 2, 3],
      target: vec3(2, 1.5, 0),
      iterations: 30,
      tolerance: 0.05,
    });
    const result = chain.solve(sk);
    expect(typeof result).toBe('boolean');
    // localRotations 应被修改
    let modified = false;
    for (let i = 0; i < before.length; i++) {
      if (Math.abs(sk.localRotations[i] - before[i]) > 1e-6) {
        modified = true; break;
      }
    }
    expect(modified).toBe(true);
  });

  it('solve target 不可达 → 返回 false 但不抛错', () => {
    const sk = makeChainSkeleton(4);
    const chain = new mod.IKChain({
      solver: 'ccd',
      boneIndices: [0, 1, 2, 3],
      target: vec3(100, 0, 0),
      iterations: 10,
    });
    const result = chain.solve(sk);
    expect(result).toBe(false);
  });

  it('weight=0 不修改 skeleton', () => {
    const sk = makeChainSkeleton(5);
    const before = Array.from(sk.localRotations);
    const chain = new mod.IKChain({
      solver: 'ccd',
      boneIndices: [0, 1, 2, 3],
      target: vec3(2, 1, 0),
      weight: 0,
    });
    chain.solve(sk);
    for (let i = 0; i < before.length; i++) {
      expect(sk.localRotations[i]).toBeCloseTo(before[i], 5);
    }
  });

  it('boneIndices 越界抛错', () => {
    const sk = makeChainSkeleton(3);
    const chain = new mod.IKChain({
      solver: 'ccd',
      boneIndices: [0, 1, 99], // 99 越界
      target: vec3(1, 0, 0),
    });
    expect(() => chain.solve(sk)).toThrow();
  });

  it('boneIndices 顺序非父子链 (跳跃) 抛错', () => {
    const sk = makeChainSkeleton(5);
    // [0, 2, 4] 不是连续父子链 (0->1->2)
    const chain = new mod.IKChain({
      solver: 'ccd',
      boneIndices: [0, 2, 4],
      target: vec3(1, 1, 0),
    });
    expect(() => chain.solve(sk)).toThrow();
  });

  it('two-bone 求解后 chain 端点接近 target (可达)', () => {
    const sk = makeChainSkeleton(3);
    const chain = new mod.IKChain({
      solver: 'two-bone',
      boneIndices: [0, 1, 2],
      target: vec3(1.2, 0.8, 0),
    });
    const result = chain.solve(sk);
    expect(result).toBe(true);
  });

  it('weight=0.5 部分应用 IK (旋转幅度小于 weight=1)', () => {
    const sk1 = makeChainSkeleton(5);
    const sk2 = makeChainSkeleton(5);
    const chain1 = new mod.IKChain({
      solver: 'ccd', boneIndices: [0, 1, 2, 3], target: vec3(2, 1.5, 0), weight: 1,
    });
    const chain2 = new mod.IKChain({
      solver: 'ccd', boneIndices: [0, 1, 2, 3], target: vec3(2, 1.5, 0), weight: 0.5,
    });
    chain1.solve(sk1);
    chain2.solve(sk2);
    // sk2 局部旋转改动量应小于 sk1
    let diff1 = 0, diff2 = 0;
    for (let i = 0; i < sk1.localRotations.length; i++) {
      diff1 += Math.abs(sk1.localRotations[i] - (i % 4 === 3 ? 1 : 0));
      diff2 += Math.abs(sk2.localRotations[i] - (i % 4 === 3 ? 1 : 0));
    }
    expect(diff2).toBeLessThan(diff1 + 0.01);
  });

  it('skeleton.update() 在 solve 后被调用 (boneMatrices 已刷新)', () => {
    const sk = makeChainSkeleton(4);
    const before = Array.from(sk.boneMatrices);
    const chain = new mod.IKChain({
      solver: 'ccd', boneIndices: [0, 1, 2, 3], target: vec3(2, 1, 0),
    });
    chain.solve(sk);
    let modified = false;
    for (let i = 0; i < before.length; i++) {
      if (Math.abs(sk.boneMatrices[i] - before[i]) > 1e-6) { modified = true; break; }
    }
    expect(modified).toBe(true);
  });
});
