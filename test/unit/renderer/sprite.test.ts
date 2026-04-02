/**
 * Pre-written tests for Sprite — billboard quad always facing camera.
 * AI must implement src/renderer/sprite.ts to make these pass.
 *
 * API — SpriteMaterial:
 *   class SpriteMaterial extends Material {
 *     color: Vec3;              // default (1,1,1) white
 *     opacity: number;          // default 1.0
 *     texture: Texture | null;  // optional texture
 *     constructor(opts?: { color?: Vec3; opacity?: number; texture?: Texture });
 *   }
 *
 *   Shader requirements:
 *   - vertexShader: billboard logic (strip rotation from modelView, keep translation+scale)
 *   - fragmentShader: apply color * opacity; if texture, sample and multiply
 *   - Uniforms: u_mvp, u_modelView, u_projection, u_color, u_opacity
 *
 * API — Sprite:
 *   class Sprite extends Node3D {
 *     material: SpriteMaterial;
 *     constructor(material?: SpriteMaterial);  // default: new SpriteMaterial()
 *   }
 *
 * Implementation notes:
 * - Sprite is a Node3D (not Mesh) — the renderer must handle it specially
 * - Billboard effect: in vertex shader, replace 3x3 rotation of modelView with identity
 * - Sprite renders a 1x1 quad centered at its position
 * - Use Node3D.scale to control sprite size (e.g., scale(2,2,1) for 2x2 sprite)
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/sprite';
import { vec3 } from '../../../src/math/vec3';
import { Node3D } from '../../../src/core/node3d';
import { Material } from '../../../src/renderer/material';
import { Texture } from '../../../src/renderer/texture';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { Sprite, SpriteMaterial } = mod;

/* ───────────── SpriteMaterial ───────────── */

describeImpl('SpriteMaterial — construction', () => {
  it('should extend Material', () => {
    const mat = new SpriteMaterial();
    expect(mat).toBeInstanceOf(Material);
  });

  it('should default to white color (1,1,1)', () => {
    const mat = new SpriteMaterial();
    expect(mat.color[0]).toBeCloseTo(1);
    expect(mat.color[1]).toBeCloseTo(1);
    expect(mat.color[2]).toBeCloseTo(1);
  });

  it('should default opacity to 1.0', () => {
    const mat = new SpriteMaterial();
    expect(mat.opacity).toBeCloseTo(1.0);
  });

  it('should default texture to null', () => {
    const mat = new SpriteMaterial();
    expect(mat.texture).toBeNull();
  });

  it('should accept custom color', () => {
    const mat = new SpriteMaterial({ color: vec3(1, 0, 0) });
    expect(mat.color[0]).toBeCloseTo(1);
    expect(mat.color[1]).toBeCloseTo(0);
    expect(mat.color[2]).toBeCloseTo(0);
  });

  it('should accept custom opacity', () => {
    const mat = new SpriteMaterial({ opacity: 0.5 });
    expect(mat.opacity).toBeCloseTo(0.5);
  });

  it('should accept texture', () => {
    const tex = Texture.defaultWhite();
    const mat = new SpriteMaterial({ texture: tex });
    expect(mat.texture).toBe(tex);
  });

  it('should provide vertex and fragment shader strings', () => {
    const mat = new SpriteMaterial();
    expect(typeof mat.vertexShader).toBe('string');
    expect(typeof mat.fragmentShader).toBe('string');
    expect(mat.vertexShader.length).toBeGreaterThan(10);
    expect(mat.fragmentShader.length).toBeGreaterThan(10);
  });
});

/* ───────────── Sprite ───────────── */

describeImpl('Sprite — construction', () => {
  it('should extend Node3D', () => {
    const s = new Sprite();
    expect(s).toBeInstanceOf(Node3D);
  });

  it('should have default SpriteMaterial', () => {
    const s = new Sprite();
    expect(s.material).toBeInstanceOf(SpriteMaterial);
  });

  it('should accept custom material', () => {
    const mat = new SpriteMaterial({ color: vec3(1, 0, 0) });
    const s = new Sprite(mat);
    expect(s.material).toBe(mat);
  });

  it('should have name "sprite" by default', () => {
    const s = new Sprite();
    expect(s.name).toBe('sprite');
  });
});

describeImpl('Sprite — scene graph', () => {
  it('should be addable as child of a Node3D', () => {
    const root = new Node3D('root');
    const s = new Sprite();
    root.addChild(s);
    expect(s.parent).toBe(root);
    expect(root.children).toContain(s);
  });

  it('should inherit world transforms from parent', () => {
    const root = new Node3D('root');
    root.position = vec3(10, 0, 0);
    const s = new Sprite();
    root.addChild(s);
    const wm = s.worldMatrix;
    expect(wm[12]).toBeCloseTo(10);
  });

  it('scale should control sprite size', () => {
    const s = new Sprite();
    s.scale = vec3(2, 3, 1);
    const lm = s.localMatrix;
    expect(lm[0]).toBeCloseTo(2);
    expect(lm[5]).toBeCloseTo(3);
  });
});
