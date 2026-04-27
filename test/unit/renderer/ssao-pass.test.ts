import { describe, it, expect, vi } from 'vitest';
import { SSAOPass } from '../../../src/renderer/post-process';

function makeProgram(): any { return { id: 'prog' }; }
function makeGL(): any {
  const calls: any[] = [];
  return {
    _calls: calls,
    getUniformLocation: vi.fn((_p, name: string) => ({ name })),
    uniform1f: vi.fn((loc: any, v: number) => calls.push(['uniform1f', loc.name, v])),
  };
}

describe('SSAOPass — constructor', () => {
  it('default options', () => {
    const p = new SSAOPass();
    expect(p.intensity).toBe(1);
    expect(p.radius).toBe(0.5);
    expect(p.bias).toBe(0.025);
    expect(p.near).toBe(0.1);
    expect(p.far).toBe(100);
    expect(p.enabled).toBe(true);
    expect(p.usesDepth).toBe(true);
    expect(p.name).toBe('ssao');
  });

  it('accepts custom options', () => {
    const p = new SSAOPass({ intensity: 1.5, radius: 1.0, bias: 0.05, near: 0.5, far: 200 });
    expect(p.intensity).toBe(1.5);
    expect(p.radius).toBe(1.0);
    expect(p.bias).toBe(0.05);
    expect(p.near).toBe(0.5);
    expect(p.far).toBe(200);
  });

  it('throws on intensity < 0', () => {
    expect(() => new SSAOPass({ intensity: -0.1 })).toThrow(/intensity/);
  });

  it('throws on intensity > 5', () => {
    expect(() => new SSAOPass({ intensity: 5.1 })).toThrow(/intensity/);
  });

  it('throws on radius <= 0', () => {
    expect(() => new SSAOPass({ radius: 0 })).toThrow(/radius/);
    expect(() => new SSAOPass({ radius: -1 })).toThrow(/radius/);
  });

  it('throws on bias < 0', () => {
    expect(() => new SSAOPass({ bias: -0.01 })).toThrow(/bias/);
  });

  it('throws on bias > 0.1', () => {
    expect(() => new SSAOPass({ bias: 0.11 })).toThrow(/bias/);
  });

  it('throws on near <= 0', () => {
    expect(() => new SSAOPass({ near: 0 })).toThrow(/near/);
  });

  it('throws on far <= near', () => {
    expect(() => new SSAOPass({ near: 10, far: 5 })).toThrow(/far/);
  });
});

describe('SSAOPass — getFragmentShader', () => {
  it('returns GLSL with u_depthTexture sampler', () => {
    const src = new SSAOPass().getFragmentShader();
    expect(src).toContain('uniform sampler2D u_depthTexture');
  });

  it('GLSL contains linearizeDepth call', () => {
    const src = new SSAOPass().getFragmentShader();
    expect(src).toContain('linearizeDepth');
  });

  it('GLSL declares all 5 numeric uniforms', () => {
    const src = new SSAOPass().getFragmentShader();
    for (const name of ['u_intensity', 'u_radius', 'u_bias', 'u_near', 'u_far']) {
      expect(src).toContain(name);
    }
  });

  it('GLSL contains occlusion accumulation logic', () => {
    const src = new SSAOPass().getFragmentShader();
    expect(src).toContain('occlusion');
  });
});

describe('SSAOPass — setUniforms', () => {
  it('binds all 5 uniforms with current values', () => {
    const gl = makeGL();
    const prog = makeProgram();
    const p = new SSAOPass({ intensity: 1.5, radius: 1.0, bias: 0.05, near: 0.5, far: 200 });
    p.setUniforms(gl, prog);
    const got = (gl as any)._calls
      .filter((c: any[]) => c[0] === 'uniform1f')
      .map((c: any[]) => [c[1], c[2]]);
    expect(got).toContainEqual(['u_intensity', 1.5]);
    expect(got).toContainEqual(['u_radius', 1.0]);
    expect(got).toContainEqual(['u_bias', 0.05]);
    expect(got).toContainEqual(['u_near', 0.5]);
    expect(got).toContainEqual(['u_far', 200]);
  });
});
