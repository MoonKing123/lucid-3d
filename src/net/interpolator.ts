export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

interface Snapshot {
  tick: number;
  x: number;
  y: number;
  z: number;
}

const MAX_SNAPSHOTS = 16;

export class RemoteEntityInterpolator {
  private readonly _lerpSpeed: number;
  private readonly _tickRate: number;
  private _targetX = 0;
  private _targetY = 0;
  private _targetZ = 0;
  private _snapshots: Snapshot[] = [];
  private _velX = 0;
  private _velY = 0;
  private _velZ = 0;

  constructor(lerpSpeed = 10, tickRate = 30) {
    this._lerpSpeed = lerpSpeed;
    this._tickRate = tickRate;
  }

  setTarget(x: number, y: number, z: number): void {
    this._targetX = x;
    this._targetY = y;
    this._targetZ = z;
  }

  setSnapshot(tick: number, x: number, y: number, z: number): void {
    const last = this._snapshots.length > 0 ? this._snapshots[this._snapshots.length - 1] : null;
    if (last) {
      const dTick = tick - last.tick;
      if (dTick > 0) {
        const dTime = dTick / this._tickRate;
        this._velX = (x - last.x) / dTime;
        this._velY = (y - last.y) / dTime;
        this._velZ = (z - last.z) / dTime;
      }
    }
    this._snapshots.push({ tick, x, y, z });
    if (this._snapshots.length > MAX_SNAPSHOTS) this._snapshots.shift();
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

  extrapolate(dt: number, current: Vec3Like): void {
    current.x += this._velX * dt;
    current.y += this._velY * dt;
    current.z += this._velZ * dt;
  }

  get targetX(): number { return this._targetX; }
  get targetY(): number { return this._targetY; }
  get targetZ(): number { return this._targetZ; }
  get snapshotCount(): number { return this._snapshots.length; }
}
