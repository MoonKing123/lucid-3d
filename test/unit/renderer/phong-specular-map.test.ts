/**
 * Pre-written tests for PhongMaterial specular map support.
 *
 * A specular map controls per-pixel specular intensity, allowing surfaces
 * to have varying shininess (e.g., scratched metal vs matte paint).
 * The specular map's RGB is sampled and multiplied with u_specular.
 *
 * API additions:
 *   PhongMaterial.specularMap: Texture | null;      // default null
 *   PhongMaterialOptions.specularMap?: Texture;
 *
 * Shader additions (fragment):
 *   uniform sampler2D u_specularMap;
 *   uniform float u_hasSpecularMap;
 *   // When hasSpecularMap=1: finalSpecular = texture2D(u_specularMap, v_uv).rgb * u_specular
 *   // When hasSpecularMap=0: finalSpecular = u_specular
 *
 * Depends on: PhongMaterial, Texture, existing UV pipeline
 */
import { describe, it, expect } from 'vitest';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { Texture } from '../../../src/renderer/texture';
import { vec3 } from '../../../src/math/vec3';

/* ───────────── Property tests ───────────── */

describe('PhongMaterial — specularMap property', () => {
  it('should default specularMap to null', () => {
    const mat = new PhongMaterial();
    expect(mat.specularMap).toBeNull();
  });

  it('should accept specularMap option in constructor', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ specularMap: tex });
    expect(mat.specularMap).toBe(tex);
  });

  it('should allow setting specularMap after construction', () => {
    const mat = new PhongMaterial();
    const tex = Texture.checkerboard(4, 4);
    mat.specularMap = tex;
    expect(mat.specularMap).toBe(tex);
  });

  it('should allow unsetting specularMap to null', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ specularMap: tex });
    mat.specularMap = null;
    expect(mat.specularMap).toBeNull();
  });

  it('should keep other defaults when only specularMap is provided', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({ specularMap: tex });
    expect(mat.diffuse[0]).toBeCloseTo(0.8);
    expect(mat.specular[0]).toBeCloseTo(1.0);
    expect(mat.shininess).toBe(32);
    expect(mat.map).toBeNull();
    expect(mat.normalMap).toBeNull();
    expect(mat.emissive[0]).toBeCloseTo(0);
  });

  it('should combine specularMap with custom specular color', () => {
    const tex = Texture.defaultWhite();
    const mat = new PhongMaterial({
      specularMap: tex,
      specular: vec3(0.5, 0.5, 0.5),
    });
    expect(mat.specularMap).toBe(tex);
    expect(mat.specular[0]).toBeCloseTo(0.5);
  });
});

/* ───────────── Shader content tests ───────────── */

describe('PhongMaterial — specular map fragment shader', () => {
  it('should declare specular map sampler uniform u_specularMap', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_specularMap');
  });

  it('should declare hasSpecularMap toggle uniform u_hasSpecularMap', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_hasSpecularMap');
  });

  it('should still contain original Phong specular uniforms', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_specular');
    expect(mat.fragmentShader).toContain('u_shininess');
  });
});
