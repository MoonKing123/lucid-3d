/**
 * Pre-written tests for Texture and TextureMaterial.
 * AI must create src/renderer/texture.ts and src/renderer/texture-material.ts.
 *
 * Depends on: #6 (UV coordinates in Geometry)
 *
 * API — Texture:
 *   class Texture {
 *     readonly width: number;
 *     readonly height: number;
 *     readonly data: Uint8Array;
 *     static fromData(width: number, height: number, data: Uint8Array): Texture;
 *     static defaultWhite(): Texture;        // 1×1 white RGBA pixel
 *     static checkerboard(w: number, h: number): Texture;  // black/white pattern
 *   }
 *
 * API — TextureMaterial:
 *   class TextureMaterial extends Material {
 *     texture: Texture;
 *     constructor(texture: Texture);
 *   }
 */
import { describe, it, expect } from 'vitest';
import { Texture } from '../../../src/renderer/texture';
import { TextureMaterial } from '../../../src/renderer/texture-material';
import { Material } from '../../../src/renderer/material';

/* ───────────── Texture ───────────── */

describe('Texture', () => {
  it('should create from raw RGBA data', () => {
    const data = new Uint8Array([255, 0, 0, 255]); // 1×1 red pixel
    const tex = Texture.fromData(1, 1, data);
    expect(tex.width).toBe(1);
    expect(tex.height).toBe(1);
    expect(tex.data).toBeInstanceOf(Uint8Array);
    expect(tex.data.length).toBe(4);
  });

  it('should store correct width and height', () => {
    const data = new Uint8Array(2 * 2 * 4); // 2×2 RGBA
    const tex = Texture.fromData(2, 2, data);
    expect(tex.width).toBe(2);
    expect(tex.height).toBe(2);
  });

  it('should copy the input data (no aliasing)', () => {
    const data = new Uint8Array([255, 0, 0, 255]);
    const tex = Texture.fromData(1, 1, data);
    data[0] = 0; // mutate original
    expect(tex.data[0]).toBe(255); // texture unaffected
  });
});

describe('Texture.defaultWhite', () => {
  it('should create a 1×1 white RGBA texture', () => {
    const tex = Texture.defaultWhite();
    expect(tex.width).toBe(1);
    expect(tex.height).toBe(1);
    expect(tex.data[0]).toBe(255);
    expect(tex.data[1]).toBe(255);
    expect(tex.data[2]).toBe(255);
    expect(tex.data[3]).toBe(255);
  });
});

describe('Texture.checkerboard', () => {
  it('should create a texture of the requested size', () => {
    const tex = Texture.checkerboard(4, 4);
    expect(tex.width).toBe(4);
    expect(tex.height).toBe(4);
    expect(tex.data.length).toBe(4 * 4 * 4);
  });

  it('should have alternating black and white pixels', () => {
    const tex = Texture.checkerboard(2, 2);
    // (0,0) = white, (1,0) = black, (0,1) = black, (1,1) = white
    // Pixel (0,0) → offset 0
    expect(tex.data[0]).toBe(255);  // R
    expect(tex.data[1]).toBe(255);  // G
    expect(tex.data[2]).toBe(255);  // B
    expect(tex.data[3]).toBe(255);  // A
    // Pixel (1,0) → offset 4
    expect(tex.data[4]).toBe(0);    // R
    expect(tex.data[5]).toBe(0);    // G
    expect(tex.data[6]).toBe(0);    // B
    expect(tex.data[7]).toBe(255);  // A (always opaque)
  });

  it('should always have opaque alpha', () => {
    const tex = Texture.checkerboard(4, 4);
    for (let i = 3; i < tex.data.length; i += 4) {
      expect(tex.data[i]).toBe(255);
    }
  });
});

/* ───────────── TextureMaterial ───────────── */

describe('TextureMaterial', () => {
  it('should extend Material', () => {
    const tex = Texture.defaultWhite();
    const mat = new TextureMaterial(tex);
    expect(mat).toBeInstanceOf(Material);
  });

  it('should store the texture reference', () => {
    const tex = Texture.fromData(1, 1, new Uint8Array([255, 0, 0, 255]));
    const mat = new TextureMaterial(tex);
    expect(mat.texture).toBe(tex);
  });
});

describe('TextureMaterial — vertex shader', () => {
  it('should declare UV attribute and varying', () => {
    const mat = new TextureMaterial(Texture.defaultWhite());
    expect(mat.vertexShader).toContain('a_uv');
    expect(mat.vertexShader).toContain('v_uv');
  });

  it('should declare MVP uniform', () => {
    const mat = new TextureMaterial(Texture.defaultWhite());
    expect(mat.vertexShader).toContain('u_mvp');
  });
});

describe('TextureMaterial — fragment shader', () => {
  it('should declare texture sampler uniform', () => {
    const mat = new TextureMaterial(Texture.defaultWhite());
    expect(mat.fragmentShader).toContain('u_texture');
    expect(mat.fragmentShader).toContain('sampler2D');
  });

  it('should sample texture with texture2D', () => {
    const mat = new TextureMaterial(Texture.defaultWhite());
    expect(mat.fragmentShader).toContain('texture2D');
  });
});
