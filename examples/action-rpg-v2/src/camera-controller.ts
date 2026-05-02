import { FollowCamera } from '../../../src/core/follow-camera';
import { vec3 } from '../../../src/math/vec3';
import type { Node3D } from '../../../src/core/node3d';

const DEFAULT_HORIZONTAL_DIST = 8;
const DEFAULT_HEIGHT          = 4;
const PITCH_MIN = -0.4;
const PITCH_MAX =  0.6;
const MOUSE_SENSITIVITY = 0.003;

/**
 * FollowCamera 包装器，增加鼠标右键拖动旋转（轨道 yaw/pitch）。
 */
export class CameraController {
  readonly camera: FollowCamera;

  private _yaw   = 0;
  private _pitch = 0.2;
  private readonly _horizDist: number;
  private readonly _height:    number;

  constructor(options?: { horizDist?: number; height?: number; damping?: number }) {
    this._horizDist = options?.horizDist ?? DEFAULT_HORIZONTAL_DIST;
    this._height    = options?.height    ?? DEFAULT_HEIGHT;

    this.camera = new FollowCamera({
      offset:       this._computeOffset(),
      lookAtOffset: vec3(0, 1, 0),
      damping:      options?.damping ?? 0.08,
    });
  }

  get yaw(): number   { return this._yaw; }
  get pitch(): number { return this._pitch; }

  setTarget(node: Node3D): void {
    this.camera.target = node;
  }

  applyMouseDelta(dx: number, dy: number): void {
    this._yaw   += dx * MOUSE_SENSITIVITY;
    this._pitch  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this._pitch + dy * MOUSE_SENSITIVITY));
    this.camera.offset = this._computeOffset();
  }

  update(dt: number): void {
    this.camera.update(dt);
  }

  snap(): void {
    this.camera.offset = this._computeOffset();
    this.camera.snap();
  }

  private _computeOffset(): ReturnType<typeof vec3> {
    const cosPitch = Math.cos(this._pitch);
    const x = this._horizDist * Math.sin(this._yaw) * cosPitch;
    const y = this._height + this._horizDist * Math.sin(this._pitch);
    const z = -this._horizDist * Math.cos(this._yaw) * cosPitch;
    return vec3(x, y, z);
  }
}
