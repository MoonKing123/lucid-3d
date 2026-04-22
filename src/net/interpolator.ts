export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export class RemoteEntityInterpolator {
  private _lerpSpeed: number;
  private _targetX = 0;
  private _targetY = 0;
  private _targetZ = 0;

  constructor(lerpSpeed = 10) {
    this._lerpSpeed = lerpSpeed;
  }

  setTarget(x: number, y: number, z: number): void {
    this._targetX = x;
    this._targetY = y;
    this._targetZ = z;
  }

  update(dt: number, current: Vec3Like): void {
    const t = 1 - Math.exp(-this._lerpSpeed * dt);
    current.x += (this._targetX - current.x) * t;
    current.y += (this._targetY - current.y) * t;
    current.z += (this._targetZ - current.z) * t;
  }

  get targetX(): number { return this._targetX; }
  get targetY(): number { return this._targetY; }
  get targetZ(): number { return this._targetZ; }
}
