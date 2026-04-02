/**
 * Pre-written tests for PhongMaterial with Blinn-Phong shading.
 * AI must create src/renderer/phong-material.ts.
 *
 * Depends on: #6 (normals), #7 (normalMatrix), #8 (lights)
 *
 * API:
 *   class PhongMaterial extends Material {
 *     ambient: Vec3;    // default [0.1, 0.1, 0.1]
 *     diffuse: Vec3;    // default [0.8, 0.8, 0.8]
 *     specular: Vec3;   // default [1.0, 1.0, 1.0]
 *     shininess: number; // default 32
 *   }
 *
 * Vertex shader must declare: a_position, a_normal, u_mvp, u_modelMatrix, u_normalMatrix
 * Fragment shader must declare: u_lightDir, u_lightColor, u_ambientColor, u_cameraPos,
 *                               u_diffuse, u_specular, u_shininess
 */
import { describe, it, expect } from 'vitest';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { Material } from '../../../src/renderer/material';
import { vec3 } from '../../../src/math/vec3';

describe('PhongMaterial', () => {
  it('should extend Material', () => {
    const mat = new PhongMaterial();
    expect(mat).toBeInstanceOf(Material);
  });

  it('should have sensible defaults', () => {
    const mat = new PhongMaterial();
    // ambient
    expect(mat.ambient[0]).toBeCloseTo(0.1);
    expect(mat.ambient[1]).toBeCloseTo(0.1);
    expect(mat.ambient[2]).toBeCloseTo(0.1);
    // diffuse
    expect(mat.diffuse[0]).toBeCloseTo(0.8);
    expect(mat.diffuse[1]).toBeCloseTo(0.8);
    expect(mat.diffuse[2]).toBeCloseTo(0.8);
    // specular
    expect(mat.specular[0]).toBeCloseTo(1.0);
    expect(mat.specular[1]).toBeCloseTo(1.0);
    expect(mat.specular[2]).toBeCloseTo(1.0);
    // shininess
    expect(mat.shininess).toBe(32);
  });

  it('should accept custom properties', () => {
    const mat = new PhongMaterial({
      ambient: vec3(0.2, 0.1, 0.05),
      diffuse: vec3(0.6, 0.4, 0.2),
      specular: vec3(0.5, 0.5, 0.5),
      shininess: 64,
    });
    expect(mat.ambient[0]).toBeCloseTo(0.2);
    expect(mat.diffuse[1]).toBeCloseTo(0.4);
    expect(mat.specular[2]).toBeCloseTo(0.5);
    expect(mat.shininess).toBe(64);
  });

  it('should allow partial custom properties (rest default)', () => {
    const mat = new PhongMaterial({ shininess: 128 });
    expect(mat.shininess).toBe(128);
    // Other properties should keep defaults
    expect(mat.ambient[0]).toBeCloseTo(0.1);
    expect(mat.diffuse[0]).toBeCloseTo(0.8);
    expect(mat.specular[0]).toBeCloseTo(1.0);
  });
});

describe('PhongMaterial — vertex shader', () => {
  it('should declare position and normal attributes', () => {
    const mat = new PhongMaterial();
    expect(mat.vertexShader).toContain('a_position');
    expect(mat.vertexShader).toContain('a_normal');
  });

  it('should declare MVP and model matrix uniforms', () => {
    const mat = new PhongMaterial();
    expect(mat.vertexShader).toContain('u_mvp');
    expect(mat.vertexShader).toContain('u_modelMatrix');
  });

  it('should declare normal matrix uniform', () => {
    const mat = new PhongMaterial();
    expect(mat.vertexShader).toContain('u_normalMatrix');
  });
});

describe('PhongMaterial — fragment shader', () => {
  it('should declare directional light uniforms', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_lightDir');
    expect(mat.fragmentShader).toContain('u_lightColor');
  });

  it('should declare ambient color uniform', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_ambientColor');
  });

  it('should declare material property uniforms', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_diffuse');
    expect(mat.fragmentShader).toContain('u_specular');
    expect(mat.fragmentShader).toContain('u_shininess');
  });

  it('should declare camera position for specular computation', () => {
    const mat = new PhongMaterial();
    expect(mat.fragmentShader).toContain('u_cameraPos');
  });
});
