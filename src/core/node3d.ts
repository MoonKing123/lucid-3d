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
  add(child: Node3D): void { this.addChild(child); }

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

  /** 提取世界空间位置（worldMatrix 第 3 列的 tx, ty, tz）。 */
  getWorldPosition(): Vec3 {
    const m = this.worldMatrix;
    return vec3(m[12], m[13], m[14]);
  }

  /**
   * 将局部方向向量通过 worldMatrix 的左上 3×3 旋转部分变换到世界空间，并归一化。
   * 默认局部前向为 (0, 0, -1)。
   */
  getWorldDirection(localDir?: Vec3): Vec3 {
    const dir = localDir ?? vec3(0, 0, -1);
    const m = this.worldMatrix;
    const x = dir[0], y = dir[1], z = dir[2];
    const wx = m[0] * x + m[4] * y + m[8] * z;
    const wy = m[1] * x + m[5] * y + m[9] * z;
    const wz = m[2] * x + m[6] * y + m[10] * z;
    const len = Math.sqrt(wx * wx + wy * wy + wz * wz);
    if (len === 0) return vec3(0, 0, -1);
    return vec3(wx / len, wy / len, wz / len);
  }

  /**
   * 设置节点旋转使其 -Z 轴朝向目标世界坐标。
   * 仅修改 this.rotation（欧拉角），不改变 this.position。
   * up 默认 (0, 1, 0)。
   */
  lookAt(target: Vec3, up?: Vec3): void {
    const worldPos = this.getWorldPosition();
    const dx = target[0] - worldPos[0];
    const dy = target[1] - worldPos[1];
    const dz = target[2] - worldPos[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 1e-10) return;

    // 前向向量（指向目标）
    const fx = dx / dist, fy = dy / dist, fz = dz / dist;

    // 确定 up 向量，避免与 forward 平行
    let upx = up ? up[0] : 0;
    let upy = up ? up[1] : 1;
    let upz = up ? up[2] : 0;
    const dotFU = fx * upx + fy * upy + fz * upz;
    if (Math.abs(dotFU) > 0.999) {
      // forward 与 up 几乎平行，换备用 up
      upx = 0; upy = 0; upz = 1;
    }

    // right = forward × up，归一化
    let rx = fy * upz - fz * upy;
    let ry = fz * upx - fx * upz;
    let rz = fx * upy - fy * upx;
    const rlen = Math.sqrt(rx * rx + ry * ry + rz * rz);
    rx /= rlen; ry /= rlen; rz /= rlen;

    // 重新计算 up = right × forward
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    // uz not needed for euler extraction

    // 从旋转矩阵提取 YXZ 欧拉角
    // col 2 = [-fx, -fy, -fz]（局部 +Z 轴方向），即 [sy*cx, -sx, cy*cx]
    // col 0 = [rx, ry, rz]（局部 +X 轴），即 [*, cx*sz, *]
    // col 1 = [ux, uy, *]（局部 +Y 轴），即 [*, cx*cz, *]
    const eulerX = Math.asin(Math.max(-1, Math.min(1, fy)));
    const eulerY = Math.atan2(-fx, -fz);
    const eulerZ = Math.atan2(ry, uy);

    this.rotation = vec3(eulerX, eulerY, eulerZ);
  }

  /**
   * 克隆节点。克隆出的节点 parent 为 null（脱离原场景图）。
   * @param recursive 默认 false — 不克隆子节点；true — 递归深克隆整棵子树
   */
  clone(recursive = false): Node3D {
    const node = new Node3D(this.name);
    node.position = vec3(this.position[0], this.position[1], this.position[2]);
    node.rotation = vec3(this.rotation[0], this.rotation[1], this.rotation[2]);
    node.scale    = vec3(this.scale[0],    this.scale[1],    this.scale[2]);
    node.visible  = this.visible;
    if (recursive) {
      for (const child of this.children) {
        node.addChild(child.clone(true));
      }
    }
    return node;
  }
}
