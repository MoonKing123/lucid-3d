import { describe, it, expect } from 'vitest';
import { LiftGammaGainPass } from '../../../src/renderer/post-process';

describe('LiftGammaGainPass', () => {
  describe('constructor defaults', () => {
    it('should default lift to [0, 0, 0]', () => {
      const pass = new LiftGammaGainPass();
      expect(pass.lift).toEqual([0, 0, 0]);
    });

    it('should default gamma to [1, 1, 1]', () => {
      const pass = new LiftGammaGainPass();
      expect(pass.gamma).toEqual([1, 1, 1]);
    });

    it('should default gain to [1, 1, 1]', () => {
      const pass = new LiftGammaGainPass();
      expect(pass.gain).toEqual([1, 1, 1]);
    });

    it('should have name "liftGammaGain" and enabled=true', () => {
      const pass = new LiftGammaGainPass();
      expect(pass.name).toBe('liftGammaGain');
      expect(pass.enabled).toBe(true);
    });
  });

  describe('custom options', () => {
    it('should accept custom lift/gamma/gain', () => {
      const pass = new LiftGammaGainPass({
        lift: [0.1, 0.0, -0.1],
        gamma: [1.2, 1.0, 0.8],
        gain: [1.1, 1.0, 0.9],
      });
      expect(pass.lift).toEqual([0.1, 0.0, -0.1]);
      expect(pass.gamma).toEqual([1.2, 1.0, 0.8]);
      expect(pass.gain).toEqual([1.1, 1.0, 0.9]);
    });
  });

  describe('parameter validation', () => {
    it('should throw when lift out of [-1, 1]', () => {
      expect(() => new LiftGammaGainPass({ lift: [1.5, 0, 0] })).toThrow();
      expect(() => new LiftGammaGainPass({ lift: [-1.5, 0, 0] })).toThrow();
    });

    it('should throw when gamma out of [0.1, 5]', () => {
      expect(() => new LiftGammaGainPass({ gamma: [0.05, 1, 1] })).toThrow();
      expect(() => new LiftGammaGainPass({ gamma: [5.5, 1, 1] })).toThrow();
      expect(() => new LiftGammaGainPass({ gamma: [0, 1, 1] })).toThrow();
    });

    it('should throw when gain out of [0, 5]', () => {
      expect(() => new LiftGammaGainPass({ gain: [-0.1, 1, 1] })).toThrow();
      expect(() => new LiftGammaGainPass({ gain: [5.5, 1, 1] })).toThrow();
    });

    it('should throw on NaN', () => {
      expect(() => new LiftGammaGainPass({ lift: [NaN, 0, 0] })).toThrow();
      expect(() => new LiftGammaGainPass({ gamma: [NaN, 1, 1] })).toThrow();
      expect(() => new LiftGammaGainPass({ gain: [NaN, 1, 1] })).toThrow();
    });
  });

  describe('getFragmentShader', () => {
    it('should return GLSL string containing u_lift/u_gamma/u_gain uniforms', () => {
      const pass = new LiftGammaGainPass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_lift');
      expect(shader).toContain('u_gamma');
      expect(shader).toContain('u_gain');
      expect(shader).toContain('u_texture');
    });
  });

  describe('setUniforms', () => {
    it('should call uniform3fv for lift/gamma/gain', () => {
      const pass = new LiftGammaGainPass({
        lift: [0.1, 0.2, 0.3],
        gamma: [1.1, 1.2, 1.3],
        gain: [1.5, 1.5, 1.5],
      });
      const calls: Array<[string, Float32Array | number[]]> = [];
      const gl = {
        getUniformLocation: (_: any, name: string) => ({ name }),
        uniform3fv: (loc: any, value: any) => {
          calls.push([loc.name, Array.from(value)]);
        },
      } as any;
      pass.setUniforms(gl, {} as any);
      const liftCall = calls.find(c => c[0] === 'u_lift');
      const gammaCall = calls.find(c => c[0] === 'u_gamma');
      const gainCall = calls.find(c => c[0] === 'u_gain');
      expect(liftCall?.[1]).toEqual([0.1, 0.2, 0.3]);
      expect(gammaCall?.[1]).toEqual([1.1, 1.2, 1.3]);
      expect(gainCall?.[1]).toEqual([1.5, 1.5, 1.5]);
    });
  });

  describe('mutation', () => {
    it('should allow runtime lift/gamma/gain mutation', () => {
      const pass = new LiftGammaGainPass();
      pass.lift = [0.2, 0.2, 0.2];
      pass.gamma = [1.5, 1.5, 1.5];
      pass.gain = [1.2, 1.2, 1.2];
      expect(pass.lift).toEqual([0.2, 0.2, 0.2]);
      expect(pass.gamma).toEqual([1.5, 1.5, 1.5]);
      expect(pass.gain).toEqual([1.2, 1.2, 1.2]);
    });
  });
});
