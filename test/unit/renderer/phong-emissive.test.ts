/**
 * Pre-written tests for PhongMaterial emissive self-illumination.
 * Enhancement to existing PhongMaterial — adds `emissive` color and `emissiveMap` texture.
 *
 * Emissive light is additive — it does not depend on scene lights.
 * Final color = ambient + diffuse + specular + emissive * emissiveTexColor
 *
 * API additions:
 *   PhongMaterial.emissive: Vec3;              // default (0,0,0) black = no emission
 *   PhongMaterial.emissiveMap: Texture | null;  // optional emission texture
 *   PhongMaterialOptions.emissive?: Vec3;
 *   PhongMaterialOptions.emissiveMap?: Texture;
 *
 * Shader additions:
 *   uniform vec3 u_emissive;
 *   uniform sampler2D u_emissiveMap;
 *   uniform float u_hasEmissiveMap;
 *
 * Depends on: PhongMaterial, Texture
 */
import { describe, it, expect } from 'vitest';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { Texture } from '../../../src/renderer/texture';
import { vec3 } from '../../../src/math/vec3';

/* ───────────── Emissive property tests ───────────── */

describe('PhongMaterial — emissive property', () => {
  it('should default emissive to black (0,0,0)', () => {
    const mat = new PhongMaterial();
    expect(mat.emissive[0]).toBeCloseTo(0);
    expect(mat.emissive[1]).toBeCloseTo(0);
    expect(mat.emissive[2]).toBeCloseTo(0);
  });

  it('should accept emissive option in constructor', () => {
    const mat = new PhongMaterial({ emissive: vec3(1, 0.5, 0) });
    expect(mat.emissive[0]).toBeCloseTo(1);
    expect(mat.emissive[1]).toBeCloseTo(0.5);
    expect(mat.emissive[2]).toBeCloseTo(0);
  });

  it('should allow setting emissive after construction', () => {
    const mat = new PhongMaterial();
    mat.emissive = vec3(0, 1, 0);
    expect(mat.emissive[1]).toBeCloseTo(1);
  });

  it('should default emissiveMap to null', () => {
    const mat = new PhongMaterial();
    expect(mat.emissiveMap).toBeNull();
  });

  it('should accept emissiveMap option in constructor', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ emissiveMap: tex });
    expect(mat.emissiveMap).toBe(tex);
  });

  it('should allow setting emissiveMap after construction', () => {
    const mat = new PhongMaterial();
    const tex = Texture.defaultWhite();
    mat.emissiveMap = tex;
    expect(mat.emissiveMap).toBe(tex);
  });

  it('should combine emissive with emissiveMap', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({
      emissive: vec3(1, 0, 0),
      emissiveMap: tex,
    });
    expect(mat.emissive[0]).toBeCloseTo(1);
    expect(mat.emissiveMap).toBe(tex);
  });

  it('should keep other defaults when only emissive is set', () => {
    const mat = new PhongMaterial({ emissive: vec3(0.5, 0.5, 0.5) });
    expect(mat.diffuse[0]).toBeCloseTo(0.8);
    expect(mat.specular[0]).toBeCloseTo(1.0);
    expect(mat.shininess).toBe(32);
    expect(mat.map).toBeNull();
  });
});

/* ───────────── All PhongMaterial options combined ───────────── */

describe('PhongMaterial — combined options', () => {
  it('should accept all options together', () => {
    const diffTex = Texture.defaultWhite();
    const emisTex = Texture.checkerboard(2, 2);
    const mat = new PhongMaterial({
      diffuse: vec3(0.9, 0.1, 0.1),
      specular: vec3(0.5, 0.5, 0.5),
      shininess: 64,
      map: diffTex,
      emissive: vec3(0.2, 0, 0),
      emissiveMap: emisTex,
    });
    expect(mat.diffuse[0]).toBeCloseTo(0.9);
    expect(mat.map).toBe(diffTex);
    expect(mat.emissive[0]).toBeCloseTo(0.2);
    expect(mat.emissiveMap).toBe(emisTex);
    expect(mat.shininess).toBe(64);
  });
});

/* ───────────── Shader content tests ───────────── */

describe('PhongMaterial — emissive shader', () => {
  it('should declare emissive color uniform u_emissive', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_emissive');
  });

  it('should declare emissive map sampler u_emissiveMap', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_emissiveMap');
  });

  it('should declare hasEmissiveMap toggle uniform', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_hasEmissiveMap');
  });
});
