import { describe, it, expect, vi } from 'vitest';
import { DOFPass } from '../../../src/renderer/post-process';

function makeProgram(): any { return { id: 'prog' }; }
function makeGL(): any {
  const calls: any[] = [];
  return {
    _calls: calls,
    getUniformLocation: vi.fn((_p, name: string) => ({ name })),
    uniform1f: vi.fn((loc: any, v: number) => calls.push(['uniform1f', loc.name, v])),
  };
}

describe('DOFPass — constructor', () => {
  it('default options', () => {
    const p = new DOFPass();
    expect(p.focusDistance).toBe(5);
    expect(p.focusRange).toBe(2);
    expect(p.blurRadius).toBe(4);
    expect(p.near).toBe(0.1);
    expect(p.far).toBe(100);
    expect(p.enabled).toBe(true);
    expect(p.usesDepth).toBe(true);
    expect(p.name).toBe('dof');
  });

  it('accepts custom options', () => {
    const p = new DOFPass({ focusDistance: 10, focusRange: 5, blurRadius: 8, near: 0.5, far: 200 });
    expect(p.focusDistance).toBe(10);
    expect(p.focusRange).toBe(5);
    expect(p.blurRadius).toBe(8);
    expect(p.near).toBe(0.5);
    expect(p.far).toBe(200);
  });

  it('throws on non-finite focusDistance', () => {
    expect(() => new DOFPass({ focusDistance: NaN })).toThrow(/focusDistance/);
    expect(() => new DOFPass({ focusDistance: Infinity })).toThrow(/focusDistance/);
  });

  it('throws on focusRange <= 0', () => {
    expect(() => new DOFPass({ focusRange: 0 })).toThrow(/focusRange/);
    expect(() => new DOFPass({ focusRange: -1 })).toThrow(/focusRange/);
  });

  it('throws on blurRadius < 0', () => {
    expect(() => new DOFPass({ blurRadius: -1 })).toThrow(/blurRadius/);
  });

  it('throws on blurRadius > 20', () => {
    expect(() => new DOFPass({ blurRadius: 21 })).toThrow(/blurRadius/);
  });

  it('throws on near <= 0', () => {
    expect(() => new DOFPass({ near: 0 })).toThrow(/near/);
  });

  it('throws on far <= near', () => {
    expect(() => new DOFPass({ near: 10, far: 5 })).toThrow(/far/);
    expect(() => new DOFPass({ near: 10, far: 10 })).toThrow(/far/);
  });
});

describe('DOFPass — getFragmentShader', () => {
  it('returns GLSL with u_depthTexture sampler', () => {
    const p = new DOFPass();
    const src = p.getFragmentShader();
    expect(src).toContain('uniform sampler2D u_depthTexture');
  });

  it('GLSL contains linearizeDepth call', () => {
    const src = new DOFPass().getFragmentShader();
    expect(src).toContain('linearizeDepth');
  });

  it('GLSL declares all 5 numeric uniforms', () => {
    const src = new DOFPass().getFragmentShader();
    for (const name of ['u_focusDistance', 'u_focusRange', 'u_blurRadius', 'u_near', 'u_far']) {
      expect(src).toContain(name);
    }
  });
});

describe('DOFPass — setUniforms', () => {
  it('binds all 5 uniforms with current values', () => {
    const gl = makeGL();
    const prog = makeProgram();
    const p = new DOFPass({ focusDistance: 7, focusRange: 3, blurRadius: 6, near: 0.5, far: 200 });
    p.setUniforms(gl, prog);
    const got = (gl as any)._calls
      .filter((c: any[]) => c[0] === 'uniform1f')
      .map((c: any[]) => [c[1], c[2]]);
    expect(got).toContainEqual(['u_focusDistance', 7]);
    expect(got).toContainEqual(['u_focusRange', 3]);
    expect(got).toContainEqual(['u_blurRadius', 6]);
    expect(got).toContainEqual(['u_near', 0.5]);
    expect(got).toContainEqual(['u_far', 200]);
  });
});
