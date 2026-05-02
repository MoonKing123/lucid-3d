/**
 * CascadedShadowMap — N 级级联阴影贴图测试。
 *
 * 类型 A stub 标记：__STUB__=true 时 describe.skip，等 Forge 实现后转正。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as mod from '../../../src/renderer/cascaded-shadow-map';
import { PerspectiveCamera } from '../../../src/core/camera';
import { vec3 } from '../../../src/math/vec3';

const { CascadedShadowMap } = mod;
const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('CascadedShadowMap', () => {
  let camera: PerspectiveCamera;
  let lightDir = vec3(0, -1, 0);

  beforeEach(() => {
    camera = new PerspectiveCamera({ fov: Math.PI / 4, aspect: 1, near: 0.1, far: 100 });
    lightDir = vec3(-0.3, -1, -0.5);
  });

  describe('constructor', () => {
    it('creates N ShadowMap instances when numCascades=N', () => {
      const csm = new CascadedShadowMap({ numCascades: 4 });
      expect(csm.cascades).toHaveLength(4);
      expect(csm.lightSpaceMatrices).toHaveLength(4);
    });

    it('default size = 1024', () => {
      const csm = new CascadedShadowMap({ numCascades: 2 });
      expect(csm.size).toBe(1024);
      // 每个 ShadowMap 应该用同样 size
      expect(csm.cascades[0].size).toBe(1024);
    });

    it('respects custom size', () => {
      const csm = new CascadedShadowMap({ numCascades: 2, size: 2048 });
      expect(csm.size).toBe(2048);
      expect(csm.cascades[0].size).toBe(2048);
    });

    it('default softness = 0 (hard shadow), default bias = 0.005', () => {
      const csm = new CascadedShadowMap({ numCascades: 2 });
      expect(csm.softness).toBe(0);
      expect(csm.bias).toBeCloseTo(0.005, 6);
    });

    it('respects softness + bias passed to all cascades', () => {
      const csm = new CascadedShadowMap({ numCascades: 4, softness: 2, bias: 0.001 });
      expect(csm.softness).toBe(2);
      expect(csm.bias).toBeCloseTo(0.001, 6);
      for (const c of csm.cascades) {
        expect(c.softness).toBe(2);
        expect(c.bias).toBeCloseTo(0.001, 6);
      }
    });

    it('throws on numCascades < 1', () => {
      expect(() => new CascadedShadowMap({ numCascades: 0 })).toThrow();
      expect(() => new CascadedShadowMap({ numCascades: -1 })).toThrow();
    });

    it('default lambda = 0.5', () => {
      const csm = new CascadedShadowMap({ numCascades: 4 });
      expect(csm.lambda).toBeCloseTo(0.5, 5);
    });
  });

  describe('update(camera, lightDir)', () => {
    it('populates splits with N CascadeSplit (continuous near→far)', () => {
      const csm = new CascadedShadowMap({ numCascades: 4 });
      csm.update(camera, lightDir);
      expect(csm.splits).toHaveLength(4);
      expect(csm.splits[0].near).toBeCloseTo(0.1, 4);
      expect(csm.splits[3].far).toBeCloseTo(100, 4);
      for (let i = 0; i < 3; i++) {
        expect(csm.splits[i].far).toBeCloseTo(csm.splits[i + 1].near, 4);
      }
    });

    it('populates lightSpaceMatrices with N Mat4', () => {
      const csm = new CascadedShadowMap({ numCascades: 4 });
      csm.update(camera, lightDir);
      expect(csm.lightSpaceMatrices).toHaveLength(4);
      for (const m of csm.lightSpaceMatrices) {
        expect(m).toBeInstanceOf(Float32Array);
        expect(m.length).toBe(16);
      }
    });

    it('different lightDir produces different lightSpaceMatrices', () => {
      const csm1 = new CascadedShadowMap({ numCascades: 2 });
      const csm2 = new CascadedShadowMap({ numCascades: 2 });
      csm1.update(camera, vec3(0, -1, 0));
      csm2.update(camera, vec3(-1, -1, 0));
      // 至少有一个矩阵元素不同
      let hasDiff = false;
      for (let i = 0; i < 16; i++) {
        if (Math.abs(csm1.lightSpaceMatrices[0][i] - csm2.lightSpaceMatrices[0][i]) > 1e-4) {
          hasDiff = true;
          break;
        }
      }
      expect(hasDiff).toBe(true);
    });

    it('cascades closer to camera have smaller frustum extent (PSSM)', () => {
      const csm = new CascadedShadowMap({ numCascades: 4, lambda: 0.5 });
      csm.update(camera, lightDir);
      // near cascade 应该比远 cascade 小
      const span0 = csm.splits[0].far - csm.splits[0].near;
      const span3 = csm.splits[3].far - csm.splits[3].near;
      expect(span3).toBeGreaterThan(span0);
    });

    it('respects custom lambda', () => {
      const csmUniform = new CascadedShadowMap({ numCascades: 2, lambda: 0 });
      const csmLog = new CascadedShadowMap({ numCascades: 2, lambda: 1 });
      csmUniform.update(camera, lightDir);
      csmLog.update(camera, lightDir);
      // lambda=0 是均分，lambda=1 是对数 → 中间 split 不同
      expect(csmUniform.splits[0].far).not.toBeCloseTo(csmLog.splits[0].far, 1);
    });

    it('called twice produces stable splits with same camera', () => {
      const csm = new CascadedShadowMap({ numCascades: 4 });
      csm.update(camera, lightDir);
      const split0 = csm.splits[0].far;
      csm.update(camera, lightDir);
      expect(csm.splits[0].far).toBeCloseTo(split0, 5);
    });
  });

  describe('dispose', () => {
    it('disposes all cascade RenderTargets without throwing on null gl-like context', () => {
      const csm = new CascadedShadowMap({ numCascades: 2 });
      // 模拟 WebGL ctx (空对象 + 必要的 noop 方法), 不验证 GPU 副作用
      const gl = {
        deleteFramebuffer: () => {},
        deleteRenderbuffer: () => {},
        deleteTexture: () => {},
      } as unknown as WebGLRenderingContext;
      expect(() => csm.dispose(gl)).not.toThrow();
    });
  });

  describe('integration with splitFrustum', () => {
    it('split values match splitFrustum output for same camera + lambda', async () => {
      const { splitFrustum } = await import('../../../src/renderer/cascade-splitter');
      const csm = new CascadedShadowMap({ numCascades: 4, lambda: 0.5 });
      csm.update(camera, lightDir);
      const expected = splitFrustum({ near: 0.1, far: 100, numCascades: 4, lambda: 0.5 });
      for (let i = 0; i < 4; i++) {
        expect(csm.splits[i].near).toBeCloseTo(expected[i].near, 4);
        expect(csm.splits[i].far).toBeCloseTo(expected[i].far, 4);
      }
    });
  });
});
