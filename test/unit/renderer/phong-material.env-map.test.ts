import { describe, it, expect } from 'vitest';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { CubeTexture, CubeTextureFace } from '../../../src/renderer/cube-texture';

describe('PhongMaterial — envMap 环境映射', () => {
  const makeCube = () => {
    const ct = new CubeTexture(1);
    const face = new Uint8Array(4);
    for (let i = 0; i < 6; i++) {
      ct.setFace(i as CubeTextureFace, face);
    }
    return ct;
  };

  it('constructs without envMap (backward compat)', () => {
    const mat = new PhongMaterial({ diffuse: [1, 0, 0] as any });
    expect(mat.envMap).toBeNull();
    expect(mat.reflectivity).toBe(0);
  });

  it('accepts envMap option', () => {
    const cube = makeCube();
    const mat = new PhongMaterial({ envMap: cube, reflectivity: 0.5 });
    expect(mat.envMap).toBe(cube);
    expect(mat.reflectivity).toBe(0.5);
  });

  it('envMapIntensity defaults to 1.0', () => {
    const mat = new PhongMaterial({ envMap: makeCube(), reflectivity: 1 });
    expect(mat.envMapIntensity).toBe(1.0);
  });

  it('envMapIntensity is read/write', () => {
    const mat = new PhongMaterial({ envMap: makeCube() });
    mat.envMapIntensity = 2.5;
    expect(mat.envMapIntensity).toBe(2.5);
  });

  it('reflectivity defaults to 0 (no reflection unless opted-in)', () => {
    const mat = new PhongMaterial({ envMap: makeCube() });
    expect(mat.reflectivity).toBe(0);
  });

  it('fragment shader includes reflect and textureCube when envMap present', () => {
    const mat = new PhongMaterial({ envMap: makeCube(), reflectivity: 0.5 });
    const fs = (mat as any).fragmentShader as string;
    expect(fs).toMatch(/reflect\(/);
    expect(fs).toMatch(/textureCube\(/);
    expect(fs).toContain('u_envMap');
  });

  it('fragment shader excludes envMap uniforms when envMap is null', () => {
    const mat = new PhongMaterial({ diffuse: [1, 0, 0] as any });
    const fs = (mat as any).fragmentShader as string;
    expect(fs).not.toContain('u_envMap');
  });

  it('envMap can be set to null to disable', () => {
    const mat = new PhongMaterial({ envMap: makeCube(), reflectivity: 0.5 });
    mat.envMap = null;
    expect(mat.envMap).toBeNull();
  });
});
