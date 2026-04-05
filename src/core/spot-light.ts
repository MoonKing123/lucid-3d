import { Light } from './light';
import { type Vec3, vec3, normalize } from '../math/vec3';

export interface SpotLightOptions {
  color?: Vec3;
  intensity?: number;
  direction?: Vec3;   // 局部空间光照方向，默认 (0, -1, 0)
  distance?: number;  // 最大作用距离，0 = 无限，默认 0
  decay?: number;     // 距离衰减指数，默认 2
  angle?: number;     // 外锥角（弧度），默认 PI/4，钳位到 [0, PI/2]
  penumbra?: number;  // 柔边比例 [0, 1]，0 = 硬边，默认 0
}

/**
 * 聚光灯 — 锥形光源，支持内/外锥角、距离衰减和阴影柔边。
 * 用于闪光灯、路灯、车灯、舞台灯等效果。
 */
export class SpotLight extends Light {
  direction: Vec3;
  distance: number;
  decay: number;
  angle: number;    // 外锥角，钳位到 [0, PI/2]
  penumbra: number; // 钳位到 [0, 1]

  constructor(opts?: SpotLightOptions) {
    super(opts?.color, opts?.intensity);
    this.direction = opts?.direction ?? vec3(0, -1, 0);
    this.distance  = opts?.distance  ?? 0;
    this.decay     = opts?.decay     ?? 2;
    this.angle     = Math.min(Math.max(opts?.angle    ?? Math.PI / 4, 0), Math.PI / 2);
    this.penumbra  = Math.min(Math.max(opts?.penumbra ?? 0,           0), 1);
  }

  /** 世界空间位置（从 worldMatrix 第四列提取） */
  get worldPosition(): Vec3 {
    const wm = this.worldMatrix;
    return vec3(wm[12], wm[13], wm[14]);
  }

  /** 世界空间光照方向（考虑父节点旋转，归一化） */
  get worldDirection(): Vec3 {
    const wm = this.worldMatrix;
    const d = this.direction;
    // 用 worldMatrix 的上左 3×3 旋转局部方向（列优先乘法）
    const x = wm[0] * d[0] + wm[4] * d[1] + wm[8]  * d[2];
    const y = wm[1] * d[0] + wm[5] * d[1] + wm[9]  * d[2];
    const z = wm[2] * d[0] + wm[6] * d[1] + wm[10] * d[2];
    return normalize(vec3(x, y, z));
  }

  /**
   * 计算目标点处的聚光灯衰减系数（0 = 无光，>0 = 有光）。
   * 同时考虑锥形衰减和距离衰减。
   */
  getAttenuationAt(target: Vec3): number {
    const worldPos = this.worldPosition;
    const worldDir = this.worldDirection;

    const dx = target[0] - worldPos[0];
    const dy = target[1] - worldPos[1];
    const dz = target[2] - worldPos[2];
    const d  = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (d < 0.0001) return 0;

    // 从光源到目标点的归一化方向
    const toX = dx / d;
    const toY = dy / d;
    const toZ = dz / d;

    // 点积：越接近 1 越靠近锥轴中心
    const spotEffect = toX * worldDir[0] + toY * worldDir[1] + toZ * worldDir[2];

    const cosOuter = Math.cos(this.angle);
    const cosInner = Math.cos(this.angle * (1 - this.penumbra));

    // smoothstep 锥形衰减
    let spotAttenuation: number;
    if (cosOuter >= cosInner) {
      // penumbra=0 的情况：硬边
      spotAttenuation = spotEffect >= cosOuter ? 1.0 : 0.0;
    } else {
      const t = Math.max(0, Math.min(1, (spotEffect - cosOuter) / (cosInner - cosOuter)));
      spotAttenuation = t * t * (3 - 2 * t);
    }

    if (spotAttenuation === 0) return 0;

    // 距离衰减（兼容 Three.js PointLight 公式）
    let distAttenuation: number;
    if (this.distance === 0) {
      distAttenuation = 1 / Math.max(Math.pow(d, this.decay), 0.01);
    } else {
      distAttenuation = Math.pow(Math.max(1 - d / this.distance, 0), this.decay);
    }

    return spotAttenuation * distAttenuation;
  }
}
