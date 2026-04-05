/**
 * Pre-written tests for PhongMaterial diffuse map (texture) support.
 * Enhancement to existing PhongMaterial — adds `map: Texture | null` property.
 *
 * When `map` is set:
 * - Vertex shader passes UV coordinates (a_uv → v_uv)
 * - Fragment shader samples texture and multiplies with diffuse color
 * - Renderer binds UV attribute and texture unit for PhongMaterial
 *
 * API additions:
 *   PhongMaterial.map: Texture | null;       // default null
 *   PhongMaterialOptions.map?: Texture;
 *
 * Shader approach:
 *   - u_hasMap: float uniform (0.0 or 1.0) toggles texture sampling
 *   - When hasMap=1: finalDiffuse = texture2D(u_map, v_uv).rgb * u_diffuse
 *   - When hasMap=0: finalDiffuse = u_diffuse
 *
 * Depends on: existing PhongMaterial, Texture, Geometry.uvs
 */
import { describe, it, expect } from 'vitest';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { Texture } from '../../../src/renderer/texture';
import { Material } from '../../../src/renderer/material';
import { vec3 } from '../../../src/math/vec3';

/* ───────────── Property tests ───────────── */

describe('PhongMaterial — diffuse map property', () => {
  it('should default map to null', () => {
    const mat = new PhongMaterial();
    expect(mat.map).toBeNull();
  });

  it('should accept map option in constructor', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ map: tex });
    expect(mat.map).toBe(tex);
  });

  it('should allow setting map after construction', () => {
    const mat = new PhongMaterial();
    const tex = Texture.defaultWhite();
    mat.map = tex;
    expect(mat.map).toBe(tex);
  });

  it('should allow unsetting map to null', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ map: tex });
    mat.map = null;
    expect(mat.map).toBeNull();
  });

  it('should keep other defaults when only map is provided', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ map: tex });
    expect(mat.diffuse[0]).toBeCloseTo(0.8);
    expect(mat.specular[0]).toBeCloseTo(1.0);
    expect(mat.shininess).toBe(32);
  });

  it('should combine map with custom diffuse color', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({
      map: tex,
      diffuse: vec3(1, 0, 0),
    });
    expect(mat.map).toBe(tex);
    expect(mat.diffuse[0]).toBeCloseTo(1);
    expect(mat.diffuse[1]).toBeCloseTo(0);
  });
});

/* ───────────── Shader content tests ───────────── */

describe('PhongMaterial — diffuse map vertex shader', () => {
  it('should declare UV attribute a_uv', () => {
    const mat = new PhongMaterial();
    expect(mat.vertexShader).toContain('a_uv');
  });

  it('should pass UV varying v_uv to fragment shader', () => {
    const mat = new PhongMaterial();
    expect(mat.vertexShader).toContain('v_uv');
  });
});

describe('PhongMaterial — diffuse map fragment shader', () => {
  it('should declare map sampler uniform u_map', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_map');
  });

  it('should declare hasMap toggle uniform u_hasMap', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_hasMap');
  });

  it('should use v_uv varying for texture sampling', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('v_uv');
  });

  it('should still contain original Phong lighting uniforms', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_diffuse');
    expect(mat.fragmentShader).toContain('u_specular');
    expect(mat.fragmentShader).toContain('u_shininess');
    expect(mat.fragmentShader).toContain('u_lightDir');
  });
});
