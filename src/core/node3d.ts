/**
 * Node3D — scene graph node with local/world transforms.
 * Supports parent-child hierarchy, depth-first traversal, and name lookup.
 */

import { type Vec3, vec3 } from '../math/vec3';
import {
  type Mat4,
  identity,
  translate,
  scale,
  rotateX,
  rotateY,
  rotateZ,
  multiply,
} from '../math/mat4';

export class Node3D {
  name: string;
  position: Vec3;
  rotation: Vec3;  // radians (x, y, z)
  scale: Vec3;

  parent: Node3D | null;
  children: Node3D[];
  /** 是否可见，默认 true */
  visible: boolean;

  constructor(name = '') {
    this.name = name;
    this.position = vec3(0, 0, 0);
    this.rotation = vec3(0, 0, 0);
    this.scale = vec3(1, 1, 1);
    this.parent = null;
    this.children = [];
    this.visible = true;
  }

  /** Add a child node, removing it from its previous parent first. */
  addChild(child: Node3D): void {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    child.parent = this;
    this.children.push(child);
  }

  /** Remove a child node and clear its parent reference. */
  removeChild(child: Node3D): void {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parent = null;
    }
  }

  /**
   * Local transform matrix: T * Ry * Rx * Rz * S
   */
  get localMatrix(): Mat4 {
    let m = identity();
    m = translate(m, this.position);
    m = rotateY(m, this.rotation[1]);
    m = rotateX(m, this.rotation[0]);
    m = rotateZ(m, this.rotation[2]);
    m = scale(m, this.scale);
    return m;
  }

  /**
   * World transform matrix.
   * For root nodes equals localMatrix; otherwise parent.worldMatrix * localMatrix.
   */
  get worldMatrix(): Mat4 {
    if (this.parent === null) {
      return this.localMatrix;
    }
    return multiply(this.parent.worldMatrix, this.localMatrix);
  }

  /** Depth-first traversal — visits parent before children. */
  traverse(callback: (node: Node3D) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  /** Find the first descendant (including self) with the given name. */
  findByName(name: string): Node3D | null {
    if (this.name === name) return this;
    for (const child of this.children) {
      const found = child.findByName(name);
      if (found !== null) return found;
    }
    return null;
  }
}
