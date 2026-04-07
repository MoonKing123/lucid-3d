import { OrbitCamera } from '../../../src/core/orbit-camera';
import { InputManager } from '../../../src/core/input';

export interface CameraRigOptions {
  aspect: number;
  input?: InputManager;
  /** 原始 canvas 元素，用于监听 wheel 事件 */
  canvas?: HTMLCanvasElement;
}

/** SLG 大地图俯视相机配置。 */
export class CameraRig {
  readonly camera: OrbitCamera;

  private _prevX = 0;
  private _prevY = 0;
  private _rotating = false;  // 右键拖动：旋转
  private _panning = false;   // 左键拖动：平移

  // WASD 平移速度（世界单位/秒）
  private readonly PAN_SPEED = 30;

  constructor(opts: CameraRigOptions) {
    this.camera = new OrbitCamera({
      target: [0, 0, 0],
      distance: 90,        // 初始距离可看到整块 128×128 地图
      minDistance: 10,     // 最近可看清单个单位
      maxDistance: 200,    // 最远可看整块地图
      enablePan: true,
      panSpeed: 1.5,
    });

    this.camera.fov = Math.PI / 4;
    this.camera.aspect = opts.aspect;
    this.camera.near = 0.5;
    this.camera.far = 500;
    // 俯视角约 55°（介于 45°-60° 之间）
    this.camera.polarAngle = (55 * Math.PI) / 180;

    this.camera.update(0);

    if (opts.input) {
      this._bindInput(opts.input);
    }

    if (opts.canvas) {
      this._bindWheel(opts.canvas);
    }
  }

  private _bindInput(input: InputManager): void {
    // 左键拖动：平移地图
    input.on('pointerdown', (e) => {
      if (e.button === 0) {
        this._panning = true;
        this._prevX = e.x ?? 0;
        this._prevY = e.y ?? 0;
      }
      if (e.button === 2) {
        this._rotating = true;
        this._prevX = e.x ?? 0;
        this._prevY = e.y ?? 0;
      }
    });

    input.on('pointerup', (e) => {
      if (e.button === 0) this._panning = false;
      if (e.button === 2) this._rotating = false;
    });

    input.on('pointermove', (e) => {
      const x = e.x ?? 0;
      const y = e.y ?? 0;
      const dx = x - this._prevX;
      const dy = y - this._prevY;
      this._prevX = x;
      this._prevY = y;

      if (this._panning) {
        // 左键：平移（负 dx 向左，正 dy 向下）
        this.camera.pan(-dx, dy);
      }
      if (this._rotating) {
        // 右键：旋转方位角和极角
        this.camera.rotate(-dx * 0.005, dy * 0.005);
      }
    });
  }

  private _bindWheel(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      // deltaY > 0 向下滚动 → 拉远（zoom out），deltaY < 0 → 拉近
      const factor = e.deltaY * 0.001;
      this.camera.zoom(-factor);
    }, { passive: false });
  }

  /**
   * 每帧更新：处理 WASD 键盘平移 + 刷新相机矩阵。
   * @param dt 帧时间（秒）
   * @param input 用于读取按键状态（可选）
   */
  update(dt: number, input?: InputManager): void {
    if (input) {
      this._handleWASD(dt, input);
    }
    this.camera.update(dt);
  }

  private _handleWASD(dt: number, input: InputManager): void {
    // 相机平移速度受距离影响——越近越慢
    const speed = this.PAN_SPEED * dt;

    if (input.isKeyDown('w') || input.isKeyDown('W') || input.isKeyDown('ArrowUp')) {
      this.camera.pan(0, -speed);
    }
    if (input.isKeyDown('s') || input.isKeyDown('S') || input.isKeyDown('ArrowDown')) {
      this.camera.pan(0, speed);
    }
    if (input.isKeyDown('a') || input.isKeyDown('A') || input.isKeyDown('ArrowLeft')) {
      this.camera.pan(-speed, 0);
    }
    if (input.isKeyDown('d') || input.isKeyDown('D') || input.isKeyDown('ArrowRight')) {
      this.camera.pan(speed, 0);
    }
  }
}
