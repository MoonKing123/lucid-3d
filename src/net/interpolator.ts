export const __STUB__ = true;

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export class RemoteEntityInterpolator {
  constructor(_lerpSpeed?: number) {
    throw new Error('Not implemented');
  }
  setTarget(_x: number, _y: number, _z: number): void { throw new Error('Not implemented'); }
  update(_dt: number, _current: Vec3Like): void { throw new Error('Not implemented'); }
  get targetX(): number { throw new Error('Not implemented'); }
  get targetY(): number { throw new Error('Not implemented'); }
  get targetZ(): number { throw new Error('Not implemented'); }
}
