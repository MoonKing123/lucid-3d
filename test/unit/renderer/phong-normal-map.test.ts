/**
 * Pre-written tests for PhongMaterial normal map support.
 *
 * Normal mapping perturbs the surface normal per-pixel using a tangent-space
 * normal map texture. This enables fine surface detail (brick walls, leather,
 * engraved metal) without increasing geometry complexity.
 *
 * Requires Geometry.tangents (vec4 per vertex) to construct the TBN matrix:
 *   T = tangent.xyz (from Geometry.computeTangents())
 *   B = cross(N, T) * tangent.w (handedness)
 *   N = vertex normal
 *
 * API additions:
 *   PhongMaterial.normalMap: Texture | null;         // default null
 *   PhongMaterialOptions.normalMap?: Texture;
 *   PhongMaterial.normalScale: number;               // default 1.0
 *   PhongMaterialOptions.normalScale?: number;
 *
 * Shader additions (vertex):
 *   attribute vec4 a_tangent;     // xyz = tangent, w = handedness
 *   varying vec3 v_tangent;
 *   varying vec3 v_bitangent;
 *
 * Shader additions (fragment):
 *   uniform sampler2D u_normalMap;
 *   uniform float u_hasNormalMap;
 *   uniform float u_normalScale;
 *   // TBN matrix → perturbed normal
 *
 * Depends on: Geometry.tangents, Geometry.computeTangents()
 * @see test/unit/renderer/geometry-tangents.test.ts
 */
import { describe, it, expect } from 'vitest';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { Texture } from '../../../src/renderer/texture';
import { vec3 } from '../../../src/math/vec3';

/* ───────────── Property tests ───────────── */

describe('PhongMaterial — normalMap property', () => {
  it('should default normalMap to null', () => {
    const mat = new PhongMaterial();
    expect(mat.normalMap).toBeNull();
  });

  it('should accept normalMap option in constructor', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ normalMap: tex });
    expect(mat.normalMap).toBe(tex);
  });

  it('should allow setting normalMap after construction', () => {
    const mat = new PhongMaterial();
    const tex = Texture.checkerboard(2, 2);
    mat.normalMap = tex;
    expect(mat.normalMap).toBe(tex);
  });

  it('should allow unsetting normalMap to null', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ normalMap: tex });
    mat.normalMap = null;
    expect(mat.normalMap).toBeNull();
  });

  it('should default normalScale to 1.0', () => {
    const mat = new PhongMaterial();
    expect(mat.normalScale).toBe(1.0);
  });

  it('should accept normalScale option in constructor', () => {
    const mat = new PhongMaterial({ normalScale: 0.5 });
    expect(mat.normalScale).toBe(0.5);
  });

  it('should keep other defaults when only normalMap is provided', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ normalMap: tex });
    expect(mat.diffuse[0]).toBeCloseTo(0.8);
    expect(mat.specular[0]).toBeCloseTo(1.0);
    expect(mat.shininess).toBe(32);
    expect(mat.map).toBeNull();
    expect(mat.emissive[0]).toBeCloseTo(0);
  });
});

/* ───────────── Shader content tests ───────────── */

describe('PhongMaterial — normal map vertex shader', () => {
  it('should declare tangent attribute a_tangent', () => {
    const mat = new PhongMaterial();
    expect(mat.vertexShader).toContain('a_tangent');
  });

  it('should pass tangent varying to fragment shader', () => {
    const mat = new PhongMaterial();
    expect(mat.vertexShader).toContain('v_tangent');
  });

  it('should pass bitangent varying to fragment shader', () => {
    const mat = new PhongMaterial();
    expect(mat.vertexShader).toContain('v_bitangent');
  });
});

describe('PhongMaterial — normal map fragment shader', () => {
  it('should declare normal map sampler uniform u_normalMap', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_normalMap');
  });

  it('should declare hasNormalMap toggle uniform u_hasNormalMap', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_hasNormalMap');
  });

  it('should declare normalScale uniform u_normalScale', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_normalScale');
  });

  it('should still contain all original Phong lighting uniforms', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_diffuse');
    expect(mat.fragmentShader).toContain('u_specular');
    expect(mat.fragmentShader).toContain('u_shininess');
    expect(mat.fragmentShader).toContain('u_lightDir');
    expect(mat.fragmentShader).toContain('u_ambientColor');
  });
});
