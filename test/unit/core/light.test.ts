/**
 * Pre-written tests for Light system.
 * AI must create src/core/light.ts with AmbientLight and DirectionalLight.
 *
 * API:
 *   abstract class Light extends Node3D { color: Vec3; intensity: number; }
 *   class AmbientLight extends Light
 *   class DirectionalLight extends Light { direction: Vec3; }
 */
import { describe, it, expect } from 'vitest';
import { AmbientLight, DirectionalLight } from '../../../src/core/light';
import { vec3 } from '../../../src/math/vec3';
import { Node3D } from '../../../src/core/node3d';

/* ───────────── AmbientLight ───────────── */

describe('AmbientLight', () => {
  it('should extend Node3D', () => {
    const light = new AmbientLight();
    expect(light).toBeInstanceOf(Node3D);
  });

  it('should have default white color and intensity 1', () => {
    const light = new AmbientLight();
    expect(light.color[0]).toBeCloseTo(1);
    expect(light.color[1]).toBeCloseTo(1);
    expect(light.color[2]).toBeCloseTo(1);
    expect(light.intensity).toBe(1);
  });

  it('should accept custom color and intensity', () => {
    const light = new AmbientLight(vec3(0.2, 0.2, 0.3), 0.5);
    expect(light.color[0]).toBeCloseTo(0.2);
    expect(light.color[1]).toBeCloseTo(0.2);
    expect(light.color[2]).toBeCloseTo(0.3);
    expect(light.intensity).toBe(0.5);
  });

  it('should participate in scene graph', () => {
    const root = new Node3D('scene');
    const light = new AmbientLight();
    root.addChild(light);
    expect(light.parent).toBe(root);
    expect(root.children).toContain(light);
  });

  it('should be discoverable by name via scene graph', () => {
    const root = new Node3D('scene');
    const light = new AmbientLight(vec3(1, 1, 1), 1);
    light.name = 'ambient';
    root.addChild(light);
    expect(root.findByName('ambient')).toBe(light);
  });
});

/* ───────────── DirectionalLight ───────────── */

describe('DirectionalLight', () => {
  it('should extend Node3D', () => {
    const light = new DirectionalLight();
    expect(light).toBeInstanceOf(Node3D);
  });

  it('should have default white color and intensity 1', () => {
    const light = new DirectionalLight();
    expect(light.color[0]).toBeCloseTo(1);
    expect(light.color[1]).toBeCloseTo(1);
    expect(light.color[2]).toBeCloseTo(1);
    expect(light.intensity).toBe(1);
  });

  it('should accept custom color and intensity', () => {
    const light = new DirectionalLight(vec3(1, 0.9, 0.8), 0.8);
    expect(light.color[0]).toBeCloseTo(1);
    expect(light.color[1]).toBeCloseTo(0.9);
    expect(light.color[2]).toBeCloseTo(0.8);
    expect(light.intensity).toBe(0.8);
  });

  it('should have default direction pointing downward (0, -1, 0)', () => {
    const light = new DirectionalLight();
    expect(light.direction[0]).toBeCloseTo(0);
    expect(light.direction[1]).toBeCloseTo(-1);
    expect(light.direction[2]).toBeCloseTo(0);
  });

  it('should accept custom direction', () => {
    const light = new DirectionalLight(vec3(1, 1, 1), 1, vec3(-1, -1, -1));
    expect(light.direction[0]).toBeCloseTo(-1);
    expect(light.direction[1]).toBeCloseTo(-1);
    expect(light.direction[2]).toBeCloseTo(-1);
  });

  it('should allow updating direction after construction', () => {
    const light = new DirectionalLight();
    light.direction = vec3(1, 0, 0);
    expect(light.direction[0]).toBeCloseTo(1);
    expect(light.direction[1]).toBeCloseTo(0);
    expect(light.direction[2]).toBeCloseTo(0);
  });

  it('should participate in scene graph traversal', () => {
    const root = new Node3D('scene');
    const light = new DirectionalLight();
    light.name = 'sun';
    root.addChild(light);

    const names: string[] = [];
    root.traverse((n) => names.push(n.name));
    expect(names).toContain('sun');
  });
});

/* ───────────── Scene collection ───────────── */

describe('Light scene collection', () => {
  it('should allow collecting all lights from scene via traverse', () => {
    const root = new Node3D('scene');
    const ambient = new AmbientLight(vec3(0.1, 0.1, 0.1), 0.3);
    const sun = new DirectionalLight(vec3(1, 1, 1), 1, vec3(-0.5, -1, -0.5));
    root.addChild(ambient);
    root.addChild(sun);

    const ambientLights: AmbientLight[] = [];
    const dirLights: DirectionalLight[] = [];
    root.traverse((node) => {
      if (node instanceof AmbientLight) ambientLights.push(node);
      else if (node instanceof DirectionalLight) dirLights.push(node);
    });

    expect(ambientLights).toHaveLength(1);
    expect(dirLights).toHaveLength(1);
    expect(dirLights[0].intensity).toBe(1);
  });

  it('should support multiple directional lights', () => {
    const root = new Node3D('scene');
    const sun = new DirectionalLight(vec3(1, 1, 0.9), 1, vec3(0, -1, 0));
    const fill = new DirectionalLight(vec3(0.4, 0.4, 0.6), 0.3, vec3(1, -0.5, 0));
    root.addChild(sun);
    root.addChild(fill);

    const dirLights: DirectionalLight[] = [];
    root.traverse((node) => {
      if (node instanceof DirectionalLight) dirLights.push(node);
    });

    expect(dirLights).toHaveLength(2);
  });
});
