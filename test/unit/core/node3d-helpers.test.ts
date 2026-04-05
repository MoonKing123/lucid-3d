import { describe, it, expect } from 'vitest';
import { Node3D } from '../../../src/core/node3d';
import { vec3, length, sub, normalize } from '../../../src/math/vec3';

const EPSILON = 1e-4;
function near(a: number, b: number) { return Math.abs(a - b) < EPSILON; }

describe('Node3D — getWorldPosition', () => {
  it('should return position for root node', () => {
    const node = new Node3D('a');
    node.position = vec3(3, 4, 5);
    const wp = node.getWorldPosition();
    expect(near(wp[0], 3)).toBe(true);
    expect(near(wp[1], 4)).toBe(true);
    expect(near(wp[2], 5)).toBe(true);
  });

  it('should include parent transform', () => {
    const parent = new Node3D('p');
    parent.position = vec3(10, 0, 0);
    const child = new Node3D('c');
    child.position = vec3(0, 5, 0);
    parent.addChild(child);
    const wp = child.getWorldPosition();
    expect(near(wp[0], 10)).toBe(true);
    expect(near(wp[1], 5)).toBe(true);
    expect(near(wp[2], 0)).toBe(true);
  });

  it('should include parent scale', () => {
    const parent = new Node3D('p');
    parent.scale = vec3(2, 2, 2);
    const child = new Node3D('c');
    child.position = vec3(1, 0, 0);
    parent.addChild(child);
    const wp = child.getWorldPosition();
    expect(near(wp[0], 2)).toBe(true);
  });
});

describe('Node3D — getWorldDirection', () => {
  it('should return default forward (0,0,-1) for identity node', () => {
    const node = new Node3D('a');
    const dir = node.getWorldDirection();
    expect(near(dir[0], 0)).toBe(true);
    expect(near(dir[1], 0)).toBe(true);
    expect(near(dir[2], -1)).toBe(true);
  });

  it('should reflect rotation', () => {
    const node = new Node3D('a');
    node.rotation = vec3(0, Math.PI / 2, 0); // 90° around Y
    const dir = node.getWorldDirection();
    // Forward (0,0,-1) rotated 90° around Y → (-1, 0, 0)
    expect(near(dir[0], -1)).toBe(true);
    expect(near(dir[1], 0)).toBe(true);
    expect(near(dir[2], 0, 0.01)).toBe(true);
  });

  it('should accept custom local direction', () => {
    const node = new Node3D('a');
    const right = node.getWorldDirection(vec3(1, 0, 0));
    expect(near(right[0], 1)).toBe(true);
    expect(near(right[1], 0)).toBe(true);
    expect(near(right[2], 0)).toBe(true);
  });
});

describe('Node3D — lookAt', () => {
  it('should face target on same Y plane', () => {
    const node = new Node3D('a');
    node.position = vec3(0, 0, 0);
    node.lookAt(vec3(0, 0, -10));
    // After lookAt forward, getWorldDirection should point toward target
    const dir = node.getWorldDirection();
    expect(near(dir[2], -1)).toBe(true);
  });

  it('should face target at 90° right', () => {
    const node = new Node3D('a');
    node.position = vec3(0, 0, 0);
    node.lookAt(vec3(10, 0, 0));
    const dir = node.getWorldDirection();
    // Should point roughly toward +X
    expect(dir[0]).toBeGreaterThan(0.9);
  });

  it('should handle target above', () => {
    const node = new Node3D('a');
    node.position = vec3(0, 0, 0);
    node.lookAt(vec3(0, 10, 0));
    const dir = node.getWorldDirection();
    // Should point roughly toward +Y
    expect(dir[1]).toBeGreaterThan(0.9);
  });

  it('should not change position', () => {
    const node = new Node3D('a');
    node.position = vec3(5, 3, 1);
    node.lookAt(vec3(10, 0, 0));
    expect(near(node.position[0], 5)).toBe(true);
    expect(near(node.position[1], 3)).toBe(true);
    expect(near(node.position[2], 1)).toBe(true);
  });

  it('should accept custom up vector', () => {
    const node = new Node3D('a');
    node.position = vec3(0, 0, 0);
    // lookAt with default up (0,1,0) should work
    node.lookAt(vec3(1, 0, 0), vec3(0, 1, 0));
    const dir = node.getWorldDirection();
    expect(dir[0]).toBeGreaterThan(0.9);
  });
});
