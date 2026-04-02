/**
 * Pre-written tests for Node3D scene graph.
 * AI must implement src/core/node3d.ts to make these pass.
 */
import { describe, it, expect } from 'vitest';
import { Node3D } from '../../src/core/node3d';
import { vec3 } from '../../src/math/vec3';

describe('Node3D', () => {
  describe('construction', () => {
    it('creates node with default values', () => {
      const node = new Node3D();
      expect(node.position).toEqual(vec3(0, 0, 0));
      expect(node.rotation).toEqual(vec3(0, 0, 0));
      expect(node.scale).toEqual(vec3(1, 1, 1));
      expect(node.children).toHaveLength(0);
      expect(node.parent).toBeNull();
    });

    it('creates node with name', () => {
      const node = new Node3D('cube');
      expect(node.name).toBe('cube');
    });
  });

  describe('hierarchy', () => {
    it('addChild establishes parent-child relationship', () => {
      const parent = new Node3D('parent');
      const child = new Node3D('child');
      parent.addChild(child);
      expect(parent.children).toContain(child);
      expect(child.parent).toBe(parent);
    });

    it('addChild removes from previous parent', () => {
      const p1 = new Node3D('p1');
      const p2 = new Node3D('p2');
      const child = new Node3D('child');
      p1.addChild(child);
      p2.addChild(child);
      expect(p1.children).not.toContain(child);
      expect(p2.children).toContain(child);
      expect(child.parent).toBe(p2);
    });

    it('removeChild clears parent reference', () => {
      const parent = new Node3D('parent');
      const child = new Node3D('child');
      parent.addChild(child);
      parent.removeChild(child);
      expect(parent.children).not.toContain(child);
      expect(child.parent).toBeNull();
    });

    it('supports multiple children', () => {
      const parent = new Node3D('parent');
      const c1 = new Node3D('c1');
      const c2 = new Node3D('c2');
      const c3 = new Node3D('c3');
      parent.addChild(c1);
      parent.addChild(c2);
      parent.addChild(c3);
      expect(parent.children).toHaveLength(3);
    });

    it('supports nested hierarchy', () => {
      const root = new Node3D('root');
      const child = new Node3D('child');
      const grandchild = new Node3D('grandchild');
      root.addChild(child);
      child.addChild(grandchild);
      expect(grandchild.parent).toBe(child);
      expect(child.parent).toBe(root);
    });
  });

  describe('local matrix', () => {
    it('default local matrix is identity', () => {
      const node = new Node3D();
      const m = node.localMatrix;
      expect(m[0]).toBeCloseTo(1);
      expect(m[5]).toBeCloseTo(1);
      expect(m[10]).toBeCloseTo(1);
      expect(m[15]).toBeCloseTo(1);
    });

    it('position affects translation in local matrix', () => {
      const node = new Node3D();
      node.position = vec3(10, 20, 30);
      const m = node.localMatrix;
      // Column-major: translation in [12], [13], [14]
      expect(m[12]).toBeCloseTo(10);
      expect(m[13]).toBeCloseTo(20);
      expect(m[14]).toBeCloseTo(30);
    });

    it('scale affects diagonal of local matrix', () => {
      const node = new Node3D();
      node.scale = vec3(2, 3, 4);
      const m = node.localMatrix;
      expect(m[0]).toBeCloseTo(2);
      expect(m[5]).toBeCloseTo(3);
      expect(m[10]).toBeCloseTo(4);
    });
  });

  describe('world matrix', () => {
    it('root node world matrix equals local matrix', () => {
      const node = new Node3D();
      node.position = vec3(5, 0, 0);
      const local = node.localMatrix;
      const world = node.worldMatrix;
      for (let i = 0; i < 16; i++) {
        expect(world[i]).toBeCloseTo(local[i]);
      }
    });

    it('child world matrix combines parent and child transforms', () => {
      const parent = new Node3D('parent');
      parent.position = vec3(10, 0, 0);
      const child = new Node3D('child');
      child.position = vec3(0, 5, 0);
      parent.addChild(child);

      const wm = child.worldMatrix;
      // Child world position should be (10, 5, 0)
      expect(wm[12]).toBeCloseTo(10);
      expect(wm[13]).toBeCloseTo(5);
      expect(wm[14]).toBeCloseTo(0);
    });

    it('nested transforms accumulate', () => {
      const a = new Node3D('a');
      a.position = vec3(1, 0, 0);
      const b = new Node3D('b');
      b.position = vec3(0, 1, 0);
      const c = new Node3D('c');
      c.position = vec3(0, 0, 1);
      a.addChild(b);
      b.addChild(c);

      const wm = c.worldMatrix;
      expect(wm[12]).toBeCloseTo(1);
      expect(wm[13]).toBeCloseTo(1);
      expect(wm[14]).toBeCloseTo(1);
    });
  });

  describe('traverse', () => {
    it('visits all nodes depth-first', () => {
      const root = new Node3D('root');
      const a = new Node3D('a');
      const b = new Node3D('b');
      const c = new Node3D('c');
      root.addChild(a);
      root.addChild(b);
      a.addChild(c);

      const visited: string[] = [];
      root.traverse(node => visited.push(node.name));
      expect(visited).toEqual(['root', 'a', 'c', 'b']);
    });
  });

  describe('findByName', () => {
    it('finds node by name in subtree', () => {
      const root = new Node3D('root');
      const child = new Node3D('target');
      root.addChild(child);
      expect(root.findByName('target')).toBe(child);
    });

    it('returns null if not found', () => {
      const root = new Node3D('root');
      expect(root.findByName('nonexistent')).toBeNull();
    });

    it('finds deeply nested node', () => {
      const root = new Node3D('root');
      const a = new Node3D('a');
      const deep = new Node3D('deep');
      root.addChild(a);
      a.addChild(deep);
      expect(root.findByName('deep')).toBe(deep);
    });
  });
});
