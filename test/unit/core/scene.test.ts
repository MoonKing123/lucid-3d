/**
 * Pre-written tests for Scene — root container with background, fog, and light collection.
 * AI must implement src/core/scene.ts to make these pass.
 *
 * API:
 *   interface FogOptions { color: Vec3; near: number; far: number }
 *   interface CollectedLights {
 *     ambient: AmbientLight[];
 *     directional: DirectionalLight[];
 *     point: PointLight[];
 *   }
 *
 *   class Scene extends Node3D {
 *     background: Vec3;              // RGB clearColor, default (0.1, 0.1, 0.1)
 *     fog: FogOptions | null;        // null = no fog
 *     constructor(opts?: { background?: Vec3; fog?: FogOptions });
 *     collectLights(): CollectedLights;  // DFS traversal, collecting light subtypes
 *   }
 *
 * Implementation notes:
 * - Scene is the root of a scene graph; it extends Node3D
 * - collectLights() traverses the tree and collects AmbientLight, DirectionalLight, PointLight
 * - WebGLRenderer should use scene.background for gl.clearColor
 * - WebGLRenderer should use scene.fog to set fog uniforms in shaders (optional for this KR)
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/core/scene';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { Scene } = mod;

import { Node3D } from '../../../src/core/node3d';
import { vec3 } from '../../../src/math/vec3';
import { AmbientLight, DirectionalLight } from '../../../src/core/light';
import { PointLight } from '../../../src/core/point-light';

/* ───────────── Construction ───────────── */

describeImpl('Scene — construction', () => {
  it('should extend Node3D', () => {
    const scene = new Scene();
    expect(scene).toBeInstanceOf(Node3D);
  });

  it('should have name "scene"', () => {
    const scene = new Scene();
    expect(scene.name).toBe('scene');
  });

  it('should have default background (0.1, 0.1, 0.1)', () => {
    const scene = new Scene();
    expect(scene.background[0]).toBeCloseTo(0.1);
    expect(scene.background[1]).toBeCloseTo(0.1);
    expect(scene.background[2]).toBeCloseTo(0.1);
  });

  it('should accept custom background', () => {
    const scene = new Scene({ background: vec3(0.5, 0.6, 0.7) });
    expect(scene.background[0]).toBeCloseTo(0.5);
    expect(scene.background[1]).toBeCloseTo(0.6);
    expect(scene.background[2]).toBeCloseTo(0.7);
  });

  it('should have null fog by default', () => {
    const scene = new Scene();
    expect(scene.fog).toBeNull();
  });

  it('should accept fog config', () => {
    const fog = { color: vec3(0.8, 0.8, 0.8), near: 10, far: 100 };
    const scene = new Scene({ fog });
    expect(scene.fog).not.toBeNull();
    expect(scene.fog!.near).toBe(10);
    expect(scene.fog!.far).toBe(100);
    expect(scene.fog!.color[0]).toBeCloseTo(0.8);
  });
});

/* ───────────── collectLights ───────────── */

describeImpl('Scene — collectLights (empty)', () => {
  it('should return empty arrays when no lights', () => {
    const scene = new Scene();
    const lights = scene.collectLights();
    expect(lights.ambient).toHaveLength(0);
    expect(lights.directional).toHaveLength(0);
    expect(lights.point).toHaveLength(0);
  });
});

describeImpl('Scene — collectLights (ambient)', () => {
  it('should collect AmbientLight', () => {
    const scene = new Scene();
    const amb = new AmbientLight(vec3(1, 1, 1), 0.5);
    scene.addChild(amb);
    const lights = scene.collectLights();
    expect(lights.ambient).toHaveLength(1);
    expect(lights.ambient[0]).toBe(amb);
  });
});

describeImpl('Scene — collectLights (directional)', () => {
  it('should collect DirectionalLight', () => {
    const scene = new Scene();
    const dir = new DirectionalLight(vec3(1, 1, 1), 1.0, vec3(0, -1, 0));
    scene.addChild(dir);
    const lights = scene.collectLights();
    expect(lights.directional).toHaveLength(1);
    expect(lights.directional[0]).toBe(dir);
  });
});

describeImpl('Scene — collectLights (point)', () => {
  it('should collect PointLight', () => {
    const scene = new Scene();
    const pt = new PointLight({ color: vec3(1, 0, 0), intensity: 2 });
    scene.addChild(pt);
    const lights = scene.collectLights();
    expect(lights.point).toHaveLength(1);
    expect(lights.point[0]).toBe(pt);
  });
});

describeImpl('Scene — collectLights (mixed)', () => {
  it('should collect multiple lights of different types', () => {
    const scene = new Scene();
    const amb1 = new AmbientLight(vec3(1, 1, 1), 0.3);
    const amb2 = new AmbientLight(vec3(0.5, 0.5, 0.5), 0.2);
    const dir = new DirectionalLight();
    const pt = new PointLight();
    scene.addChild(amb1);
    scene.addChild(amb2);
    scene.addChild(dir);
    scene.addChild(pt);

    const lights = scene.collectLights();
    expect(lights.ambient).toHaveLength(2);
    expect(lights.directional).toHaveLength(1);
    expect(lights.point).toHaveLength(1);
  });

  it('should collect lights from nested children', () => {
    const scene = new Scene();
    const group = new Node3D('group');
    const nested = new Node3D('nested');
    const amb = new AmbientLight();
    const pt = new PointLight();

    scene.addChild(group);
    group.addChild(nested);
    nested.addChild(amb);
    group.addChild(pt);

    const lights = scene.collectLights();
    expect(lights.ambient).toHaveLength(1);
    expect(lights.ambient[0]).toBe(amb);
    expect(lights.point).toHaveLength(1);
    expect(lights.point[0]).toBe(pt);
  });
});

/* ───────────── Scene as Node3D ───────────── */

describeImpl('Scene — scene graph operations', () => {
  it('should support addChild/removeChild', () => {
    const scene = new Scene();
    const child = new Node3D('obj');
    scene.addChild(child);
    expect(scene.children).toHaveLength(1);
    scene.removeChild(child);
    expect(scene.children).toHaveLength(0);
  });

  it('should support traverse', () => {
    const scene = new Scene();
    const a = new Node3D('a');
    const b = new Node3D('b');
    scene.addChild(a);
    scene.addChild(b);

    const names: string[] = [];
    scene.traverse((n) => names.push(n.name));
    expect(names).toEqual(['scene', 'a', 'b']);
  });

  it('background should be mutable after construction', () => {
    const scene = new Scene();
    scene.background = vec3(1, 0, 0);
    expect(scene.background[0]).toBeCloseTo(1);
    expect(scene.background[1]).toBeCloseTo(0);
    expect(scene.background[2]).toBeCloseTo(0);
  });
});
