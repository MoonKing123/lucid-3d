import { describe, it, expect } from 'vitest';
import { Node3D } from '../../../src/core/node3d';
import { Mesh } from '../../../src/renderer/mesh';
import { Geometry, createCubeGeometry } from '../../../src/renderer/geometry';
import { Material } from '../../../src/renderer/material';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { Texture } from '../../../src/renderer/texture';
import { vec3 } from '../../../src/math/vec3';

describe('Clone API', () => {
  describe('Geometry.clone()', () => {
    it('deep-copies all buffers', () => {
      const geo = createCubeGeometry();
      const cloned = geo.clone();
      expect(cloned.positions).toEqual(geo.positions);
      expect(cloned.positions).not.toBe(geo.positions);
      expect(cloned.colors).not.toBe(geo.colors);
      expect(cloned.normals).toEqual(geo.normals);
      expect(cloned.normals).not.toBe(geo.normals);
      expect(cloned.uvs).toEqual(geo.uvs);
      expect(cloned.uvs).not.toBe(geo.uvs);
      expect(cloned.indices).toEqual(geo.indices);
      expect(cloned.indices).not.toBe(geo.indices);
    });

    it('handles null optional fields', () => {
      const geo = new Geometry({ positions: new Float32Array([0, 1, 2]) });
      const cloned = geo.clone();
      expect(cloned.positions).toEqual(new Float32Array([0, 1, 2]));
      expect(cloned.normals).toBeNull();
      expect(cloned.uvs).toBeNull();
      expect(cloned.indices).toBeNull();
      expect(cloned.joints).toBeNull();
      expect(cloned.weights).toBeNull();
      expect(cloned.tangents).toBeNull();
    });

    it('cloned buffers are independent', () => {
      const geo = createCubeGeometry();
      const cloned = geo.clone();
      cloned.positions[0] = 999;
      expect(geo.positions[0]).not.toBe(999);
    });
  });

  describe('Material.clone()', () => {
    it('creates independent copy with same properties', () => {
      const mat = new Material();
      mat.opacity = 0.7;
      mat.transparent = true;
      const cloned = mat.clone();
      expect(cloned.vertexShader).toBe(mat.vertexShader);
      expect(cloned.fragmentShader).toBe(mat.fragmentShader);
      expect(cloned.opacity).toBe(0.7);
      expect(cloned.transparent).toBe(true);
    });

    it('cloned material is independent', () => {
      const mat = new Material();
      const cloned = mat.clone();
      cloned.opacity = 0.3;
      expect(mat.opacity).toBe(1);
    });
  });

  describe('PhongMaterial.clone()', () => {
    it('deep-copies all color properties', () => {
      const tex = Texture.defaultWhite();
      const mat = new PhongMaterial({
        diffuse: vec3(1, 0, 0),
        specular: vec3(0.5, 0.5, 0.5),
        shininess: 64,
        map: tex,
        emissive: vec3(0.1, 0, 0),
      });
      const cloned = mat.clone();
      expect(cloned.diffuse).toEqual(vec3(1, 0, 0));
      expect(cloned.specular).toEqual(vec3(0.5, 0.5, 0.5));
      expect(cloned.shininess).toBe(64);
      expect(cloned.emissive).toEqual(vec3(0.1, 0, 0));
      // Texture 共享引用
      expect(cloned.map).toBe(tex);
    });

    it('color properties are independent', () => {
      const mat = new PhongMaterial({ diffuse: vec3(1, 0, 0) });
      const cloned = mat.clone();
      cloned.diffuse = vec3(0, 1, 0);
      expect(mat.diffuse).toEqual(vec3(1, 0, 0));
    });

    it('returns PhongMaterial instance', () => {
      const mat = new PhongMaterial();
      const cloned = mat.clone();
      expect(cloned).toBeInstanceOf(PhongMaterial);
    });
  });

  describe('Node3D.clone()', () => {
    it('shallow clone copies transform but not children', () => {
      const parent = new Node3D('parent');
      parent.position = vec3(1, 2, 3);
      parent.rotation = vec3(0.1, 0.2, 0.3);
      parent.scale = vec3(2, 2, 2);
      parent.addChild(new Node3D('child'));

      const cloned = parent.clone(false);
      expect(cloned.name).toBe('parent');
      expect(cloned.position).toEqual(vec3(1, 2, 3));
      expect(cloned.rotation).toEqual(vec3(0.1, 0.2, 0.3));
      expect(cloned.scale).toEqual(vec3(2, 2, 2));
      expect(cloned.children.length).toBe(0);
    });

    it('deep clone includes children recursively', () => {
      const root = new Node3D('root');
      const child = new Node3D('child');
      const grandchild = new Node3D('grandchild');
      root.addChild(child);
      child.addChild(grandchild);

      const cloned = root.clone(true);
      expect(cloned.children.length).toBe(1);
      expect(cloned.children[0].name).toBe('child');
      expect(cloned.children[0].children.length).toBe(1);
      expect(cloned.children[0].children[0].name).toBe('grandchild');
      expect(cloned.children[0]).not.toBe(child);
      expect(cloned.children[0].children[0]).not.toBe(grandchild);
    });

    it('cloned node is detached from original parent', () => {
      const parent = new Node3D('parent');
      const child = new Node3D('child');
      parent.addChild(child);

      const cloned = child.clone();
      expect(cloned.parent).toBeNull();
    });

    it('transform values are independent', () => {
      const node = new Node3D('test');
      node.position = vec3(1, 0, 0);
      const cloned = node.clone();
      cloned.position = vec3(99, 0, 0);
      expect(node.position[0]).toBe(1);
    });
  });

  describe('Mesh.clone()', () => {
    it('shallow clone shares geometry and material', () => {
      const geo = createCubeGeometry();
      const mat = new PhongMaterial();
      const mesh = new Mesh(geo, mat);
      mesh.position = vec3(5, 0, 0);

      const cloned = mesh.clone(false) as Mesh;
      expect(cloned).toBeInstanceOf(Mesh);
      expect(cloned.geometry).toBe(geo);
      expect(cloned.material).toBe(mat);
      expect(cloned.position).toEqual(vec3(5, 0, 0));
    });

    it('deep clone creates independent geometry and material', () => {
      const geo = createCubeGeometry();
      const mat = new PhongMaterial({ diffuse: vec3(1, 0, 0) });
      const mesh = new Mesh(geo, mat);

      const cloned = mesh.clone(true) as Mesh;
      expect(cloned.geometry).not.toBe(geo);
      expect(cloned.material).not.toBe(mat);
      expect(cloned.geometry.positions).toEqual(geo.positions);
      expect((cloned.material as PhongMaterial).diffuse).toEqual(vec3(1, 0, 0));
    });
  });
});
