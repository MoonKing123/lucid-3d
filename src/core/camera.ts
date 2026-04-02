/**
 * Camera 抽象基类 + PerspectiveCamera + OrthographicCamera。
 * Camera extends Node3D，保留场景图参与能力。
 */

import { Node3D } from './node3d';
import { type Vec3, vec3 } from '../math/vec3';
import {
  type Mat4,
  perspective,
  ortho,
  lookAt as mat4LookAt,
  multiply,
} from '../math/mat4';

/** Camera 抽象基类 — 所有相机共享的接口 */
export abstract class Camera extends Node3D {
  abstract get projectionMatrix(): Mat4;
  abstract get viewMatrix(): Mat4;
  abstract get viewProjectionMatrix(): Mat4;
  abstract lookAt(target: Vec3): void;
}

export class PerspectiveCamera extends Camera {
  fov: number;
  aspect: number;
  near: number;
  far: number;

  /** Internal target used by lookAt(); defaults to looking down -Z axis. */
  private _target: Vec3;

  constructor(opts?: { fov?: number; aspect?: number; near?: number; far?: number }) {
    super('camera');
    this.fov    = opts?.fov    ?? Math.PI / 4;
    this.aspect = opts?.aspect ?? 1;
    this.near   = opts?.near   ?? 0.1;
    this.far    = opts?.far    ?? 100;
    // Default target: one unit in front (down -Z)
    this._target = vec3(0, 0, -1);
  }

  /** Perspective projection matrix, recalculated from current fov/aspect/near/far. */
  get projectionMatrix(): Mat4 {
    return perspective(this.fov, this.aspect, this.near, this.far);
  }

  /**
   * View matrix derived from camera position and look-at target.
   * When position changes, the view matrix reflects the new position automatically.
   */
  get viewMatrix(): Mat4 {
    const eye = this.position;
    const up  = vec3(0, 1, 0);
    return mat4LookAt(eye, this._target, up);
  }

  /** Combined view-projection matrix: projection * view. */
  get viewProjectionMatrix(): Mat4 {
    return multiply(this.projectionMatrix, this.viewMatrix);
  }

  /**
   * Orient the camera to face the given target point.
   * Stores the target so that subsequent viewMatrix reads reflect it.
   */
  lookAt(target: Vec3): void {
    this._target = target;
  }
}

export class OrthographicCamera extends Camera {
  left: number;
  right: number;
  bottom: number;
  top: number;
  near: number;
  far: number;

  private _target: Vec3;

  constructor(
    left: number, right: number,
    bottom: number, top: number,
    near = 0.1, far = 100,
  ) {
    super('orthographic-camera');
    this.left   = left;
    this.right  = right;
    this.bottom = bottom;
    this.top    = top;
    this.near   = near;
    this.far    = far;
    this._target = vec3(0, 0, -1);
  }

  get projectionMatrix(): Mat4 {
    return ortho(this.left, this.right, this.bottom, this.top, this.near, this.far);
  }

  get viewMatrix(): Mat4 {
    return mat4LookAt(this.position, this._target, vec3(0, 1, 0));
  }

  get viewProjectionMatrix(): Mat4 {
    return multiply(this.projectionMatrix, this.viewMatrix);
  }

  lookAt(target: Vec3): void {
    this._target = target;
  }
}
