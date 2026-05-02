/**
 * CascadeSplitter — PSSM 划分纯函数测试。
 *
 * 类型 A stub 标记：__STUB__=true 时 describe.skip，等 Forge 实现后转正。
 */

import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/cascade-splitter';

const { splitFrustum } = mod;
const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('CascadeSplitter — splitFrustum', () => {
  it('numCascades=1 returns single split spanning [near, far]', () => {
    const splits = splitFrustum({ near: 0.1, far: 100, numCascades: 1 });
    expect(splits).toHaveLength(1);
    expect(splits[0].near).toBeCloseTo(0.1, 5);
    expect(splits[0].far).toBeCloseTo(100, 5);
  });

  it('numCascades=4 returns 4 splits', () => {
    const splits = splitFrustum({ near: 0.1, far: 100, numCascades: 4 });
    expect(splits).toHaveLength(4);
  });

  it('first cascade.near == input near', () => {
    const splits = splitFrustum({ near: 0.5, far: 200, numCascades: 4 });
    expect(splits[0].near).toBeCloseTo(0.5, 5);
  });

  it('last cascade.far == input far', () => {
    const splits = splitFrustum({ near: 0.5, far: 200, numCascades: 4 });
    expect(splits[3].far).toBeCloseTo(200, 5);
  });

  it('adjacent cascades are continuous: cascades[i].far == cascades[i+1].near', () => {
    const splits = splitFrustum({ near: 1, far: 100, numCascades: 4, lambda: 0.5 });
    for (let i = 0; i < splits.length - 1; i++) {
      expect(splits[i].far).toBeCloseTo(splits[i + 1].near, 5);
    }
  });

  it('lambda=0 produces uniform splits ((far-near)/N each)', () => {
    const splits = splitFrustum({ near: 0, far: 100, numCascades: 4, lambda: 0 });
    expect(splits[0].far - splits[0].near).toBeCloseTo(25, 4);
    expect(splits[1].far - splits[1].near).toBeCloseTo(25, 4);
    expect(splits[2].far - splits[2].near).toBeCloseTo(25, 4);
    expect(splits[3].far - splits[3].near).toBeCloseTo(25, 4);
  });

  it('lambda=1 produces logarithmic splits (ratio = (far/near)^(1/N))', () => {
    const splits = splitFrustum({ near: 1, far: 100, numCascades: 2, lambda: 1 });
    // log: 1 → 10 → 100，相邻比例 = sqrt(100/1) = 10
    expect(splits[0].far).toBeCloseTo(10, 3);
    expect(splits[1].near).toBeCloseTo(10, 3);
  });

  it('lambda=0.5 produces interpolated splits between uniform and log', () => {
    const uniform = splitFrustum({ near: 1, far: 100, numCascades: 2, lambda: 0 });
    const log = splitFrustum({ near: 1, far: 100, numCascades: 2, lambda: 1 });
    const mixed = splitFrustum({ near: 1, far: 100, numCascades: 2, lambda: 0.5 });
    const expectedMid = uniform[0].far * 0.5 + log[0].far * 0.5;
    expect(mixed[0].far).toBeCloseTo(expectedMid, 2);
  });

  it('lambda defaults to 0.5 when omitted', () => {
    const omitted = splitFrustum({ near: 1, far: 100, numCascades: 4 });
    const explicit = splitFrustum({ near: 1, far: 100, numCascades: 4, lambda: 0.5 });
    expect(omitted[2].far).toBeCloseTo(explicit[2].far, 5);
  });

  it('throws on numCascades < 1', () => {
    expect(() => splitFrustum({ near: 0.1, far: 100, numCascades: 0 })).toThrow();
    expect(() => splitFrustum({ near: 0.1, far: 100, numCascades: -1 })).toThrow();
  });

  it('throws on near >= far', () => {
    expect(() => splitFrustum({ near: 100, far: 100, numCascades: 4 })).toThrow();
    expect(() => splitFrustum({ near: 200, far: 100, numCascades: 4 })).toThrow();
  });
});
