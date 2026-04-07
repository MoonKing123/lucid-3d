import { OrbitCamera } from '../../../src/core/orbit-camera';
import { InputManager } from '../../../src/core/input';

export interface CameraRigOptions {
  aspect: number;
  input?: InputManager;
}

export class CameraRig {
  readonly camera: OrbitCamera;

  private _prevX = 0;
  private _prevY = 0;
  private _dragging = false;

  constructor(opts: CameraRigOptions) {
    this.camera = new OrbitCamera({
      target: [0, 0, 0],
      distance: 18,
      minDistance: 5,
      maxDistance: 60,
    });
    // PerspectiveCamera 的属性直接赋值
    this.camera.fov = Math.PI / 4;
    this.camera.aspect = opts.aspect;
    this.camera.near = 0.1;
    this.camera.far = 200;
    this.camera.polarAngle = Math.PI / 4;

    // 初始化相机位置
    this.camera.update(0);

    if (opts.input) {
      this._bindInput(opts.input);
    }
  }

  private _bindInput(input: InputManager): void {
    // 右键拖动旋转
    input.on('pointerdown', (e) => {
      if (e.button === 2) {
        this._dragging = true;
        this._prevX = e.x ?? 0;
        this._prevY = e.y ?? 0;
      }
    });

    input.on('pointerup', (e) => {
      if (e.button === 2) {
        this._dragging = false;
      }
    });

    input.on('pointermove', (e) => {
      if (!this._dragging) return;
      const x = e.x ?? 0;
      const y = e.y ?? 0;
      const dx = x - this._prevX;
      const dy = y - this._prevY;
      this._prevX = x;
      this._prevY = y;
      // 每像素 0.005 弧度
      this.camera.rotate(-dx * 0.005, dy * 0.005);
    });
  }

  update(dt: number): void {
    this.camera.update(dt);
  }
}
