import { describe, it, expect } from 'vitest';
import { VibrancePass } from '../../../src/renderer/post-process';

describe('VibrancePass', () => {
  describe('constructor defaults', () => {
    it('should default vibrance to 0', () => {
      const pass = new VibrancePass();
      expect(pass.vibrance).toBe(0);
    });

    it('should have name "vibrance" and enabled=true', () => {
      const pass = new VibrancePass();
      expect(pass.name).toBe('vibrance');
      expect(pass.enabled).toBe(true);
    });
  });

  describe('custom options', () => {
    it('should accept custom vibrance', () => {
      const pass = new VibrancePass({ vibrance: 0.5 });
      expect(pass.vibrance).toBe(0.5);
    });

    it('should accept boundary values', () => {
      const pass1 = new VibrancePass({ vibrance: 1 });
      expect(pass1.vibrance).toBe(1);
      const pass2 = new VibrancePass({ vibrance: -1 });
      expect(pass2.vibrance).toBe(-1);
      const pass3 = new VibrancePass({ vibrance: 0 });
      expect(pass3.vibrance).toBe(0);
    });
  });

  describe('parameter validation', () => {
    it('should throw when vibrance out of [-1, 1]', () => {
      expect(() => new VibrancePass({ vibrance: 1.5 })).toThrow();
      expect(() => new VibrancePass({ vibrance: -1.5 })).toThrow();
      expect(() => new VibrancePass({ vibrance: 2 })).toThrow();
    });

    it('should throw on NaN', () => {
      expect(() => new VibrancePass({ vibrance: NaN })).toThrow();
    });

    it('should throw on Infinity', () => {
      expect(() => new VibrancePass({ vibrance: Infinity })).toThrow();
    });
  });

  describe('getFragmentShader', () => {
    it('should return GLSL containing u_vibrance uniform', () => {
      const pass = new VibrancePass();
      const shader = pass.getFragmentShader();
      expect(shader).toContain('u_vibrance');
      expect(shader).toContain('u_texture');
    });

    it('should include luma calculation (Rec.709 weights)', () => {
      const pass = new VibrancePass();
      const shader = pass.getFragmentShader();
      expect(shader).toMatch(/0\.2126|luma/);
    });

    it('should include saturation weight (1 - currentSat)', () => {
      const pass = new VibrancePass();
      const shader = pass.getFragmentShader();
      // 验证 max - min 结构（HSV saturation 近似）
      expect(shader).toMatch(/max\(.*max\(|min\(.*min\(/);
    });
  });

  describe('setUniforms', () => {
    it('should call uniform1f for vibrance', () => {
      const pass = new VibrancePass({ vibrance: 0.3 });
      const calls: Array<[string, number]> = [];
      const gl = {
        getUniformLocation: (_: any, name: string) => ({ name }),
        uniform1f: (loc: any, value: number) => calls.push([loc.name, value]),
      } as any;
      pass.setUniforms(gl, {} as any);
      expect(calls.find(c => c[0] === 'u_vibrance')?.[1]).toBeCloseTo(0.3);
    });
  });

  describe('mutation', () => {
    it('should allow runtime vibrance mutation', () => {
      const pass = new VibrancePass();
      pass.vibrance = 0.7;
      expect(pass.vibrance).toBe(0.7);
      pass.vibrance = -0.3;
      expect(pass.vibrance).toBe(-0.3);
    });
  });

  describe('integration', () => {
    it('should coexist with SaturationPass (both exported)', async () => {
      const mod = await import('../../../src/renderer/post-process');
      expect(mod.VibrancePass).toBeDefined();
      expect(mod.SaturationPass).toBeDefined();
    });
  });
});
