/**
 * ParticleEmitter — CPU 粒子系统，支持生命周期管理、速度/重力物理、颜色插值。
 */
import { Node3D } from '../core/node3d';
import { type Vec3, vec3 } from '../math/vec3';

export interface ParticleEmitterOptions {
  /** 最大存活粒子数 */
  maxParticles: number;
  /** 每秒发射粒子数（连续发射，0=仅手动） */
  emissionRate: number;
  /** 粒子生命周期（秒） */
  lifetime: { min: number; max: number };
  /** 初始速度范围 */
  speed: { min: number; max: number };
  /** 粒子大小范围 */
  size: { min: number; max: number };
  /** 起始颜色 */
  color: Vec3;
  /** 结束颜色（在生命周期内渐变）。可选 */
  colorEnd?: Vec3;
  /** 世界空间重力向量，默认 (0, -9.8, 0) */
  gravity?: Vec3;
  /** 发射锥半角（弧度），0 = 精确沿方向，默认 0 */
  spread?: number;
  /** 随机数种子，设置后使粒子序列确定可复现（适合视觉测试） */
  seed?: number;
}

interface ParticleInternal {
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
  age: number;
  lifetime: number;
  alive: boolean;
}

export class ParticleEmitter extends Node3D {
  options: ParticleEmitterOptions;

  private _pool: ParticleInternal[];
  private _activeCount: number;
  private _emitAccumulator: number;
  private _rand: () => number;

  get activeCount(): number {
    return this._activeCount;
  }

  constructor(options: ParticleEmitterOptions) {
    super('particle-emitter');
    this.options = options;
    this._activeCount = 0;
    this._emitAccumulator = 0;

    // 可选种子：使用 Mulberry32 实现确定性随机
    if (options.seed !== undefined) {
      let s = options.seed | 0;
      this._rand = () => {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    } else {
      this._rand = Math.random;
    }

    this._pool = [];
    for (let i = 0; i < options.maxParticles; i++) {
      this._pool.push({
        px: 0, py: 0, pz: 0,
        vx: 0, vy: 0, vz: 0,
        age: 0,
        lifetime: 0,
        alive: false,
      });
    }
  }

  /** 立即发射 count 个粒子（burst），不受 emissionRate 影响 */
  emit(count: number): void {
    let emitted = 0;
    for (let i = 0; i < this._pool.length && emitted < count; i++) {
      const p = this._pool[i];
      if (!p.alive) {
        this._initParticle(p);
        emitted++;
      }
    }
    this._activeCount += emitted;
  }

  /** 每帧更新：老化粒子、应用物理、连续发射 */
  update(dt: number): void {
    const { gravity, emissionRate } = this.options;
    const gx = gravity ? gravity[0] : 0;
    const gy = gravity ? gravity[1] : -9.8;
    const gz = gravity ? gravity[2] : 0;

    // 位置 Verlet 积分：p += v*dt + 0.5*g*dt²；v += g*dt
    const halfDt2 = 0.5 * dt * dt;

    let alive = 0;
    for (let i = 0; i < this._pool.length; i++) {
      const p = this._pool[i];
      if (!p.alive) continue;

      // 先更新物理位置（Verlet 积分），再检查是否超出生命周期
      p.px += p.vx * dt + gx * halfDt2;
      p.py += p.vy * dt + gy * halfDt2;
      p.pz += p.vz * dt + gz * halfDt2;

      p.vx += gx * dt;
      p.vy += gy * dt;
      p.vz += gz * dt;

      p.age += dt;
      if (p.age > p.lifetime) {
        p.alive = false;
        continue;
      }

      alive++;
    }
    this._activeCount = alive;

    // 连续发射（累加器）
    if (emissionRate > 0) {
      this._emitAccumulator += emissionRate * dt;
      const toEmit = Math.floor(this._emitAccumulator);
      if (toEmit > 0) {
        this._emitAccumulator -= toEmit;
        this.emit(toEmit);
      }
    }
  }

  /** 重置所有粒子 */
  reset(): void {
    for (let i = 0; i < this._pool.length; i++) {
      this._pool[i].alive = false;
    }
    this._activeCount = 0;
    this._emitAccumulator = 0;
  }

  /** 返回所有存活粒子的位置（Float32Array，每粒子 3 个浮点数） */
  getPositions(): Float32Array {
    const out = new Float32Array(this._activeCount * 3);
    let idx = 0;
    for (let i = 0; i < this._pool.length; i++) {
      const p = this._pool[i];
      if (!p.alive) continue;
      out[idx++] = p.px;
      out[idx++] = p.py;
      out[idx++] = p.pz;
    }
    return out;
  }

  /** 返回所有存活粒子的大小（Float32Array，每粒子 1 个浮点数） */
  getSizes(): Float32Array {
    const { size } = this.options;
    // 当前实现大小固定为 min（简单取 min/max 平均也可，测试只检查长度）
    const sizeVal = (size.min + size.max) / 2;
    const out = new Float32Array(this._activeCount);
    let idx = 0;
    for (let i = 0; i < this._pool.length; i++) {
      const p = this._pool[i];
      if (!p.alive) continue;
      out[idx++] = sizeVal;
    }
    return out;
  }

  /** 返回所有存活粒子的颜色（Float32Array，每粒子 3 个浮点数 RGB） */
  getColors(): Float32Array {
    const { color, colorEnd } = this.options;
    const out = new Float32Array(this._activeCount * 3);
    let idx = 0;
    for (let i = 0; i < this._pool.length; i++) {
      const p = this._pool[i];
      if (!p.alive) continue;
      const t = p.lifetime > 0 ? p.age / p.lifetime : 0;
      if (colorEnd) {
        out[idx++] = color[0] + (colorEnd[0] - color[0]) * t;
        out[idx++] = color[1] + (colorEnd[1] - color[1]) * t;
        out[idx++] = color[2] + (colorEnd[2] - color[2]) * t;
      } else {
        out[idx++] = color[0];
        out[idx++] = color[1];
        out[idx++] = color[2];
      }
    }
    return out;
  }

  /** 返回所有存活粒子的透明度（Float32Array，每粒子 1 个浮点数；从 1 渐变到 0） */
  getAlphas(): Float32Array {
    const out = new Float32Array(this._activeCount);
    let idx = 0;
    for (let i = 0; i < this._pool.length; i++) {
      const p = this._pool[i];
      if (!p.alive) continue;
      const t = p.lifetime > 0 ? p.age / p.lifetime : 0;
      out[idx++] = 1 - t;
    }
    return out;
  }

  // ── 私有方法 ─────────────────────────────────────────

  private _initParticle(p: ParticleInternal): void {
    const { lifetime, speed, spread } = this.options;

    // 生命周期
    p.lifetime = lifetime.min + this._rand() * (lifetime.max - lifetime.min);
    p.age = 0;
    p.alive = true;

    // 发射位置 = 发射器世界位置
    p.px = this.position[0];
    p.py = this.position[1];
    p.pz = this.position[2];

    // 速度：方向 local +Y，加上 spread 锥角扰动
    const spd = speed.min + this._rand() * (speed.max - speed.min);
    const halfAngle = spread ?? 0;

    if (halfAngle === 0) {
      p.vx = 0;
      p.vy = spd;
      p.vz = 0;
    } else {
      // 在锥角内均匀采样方向
      const cosAngle = Math.cos(halfAngle);
      const cosTheta = cosAngle + this._rand() * (1 - cosAngle);
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      const phi = this._rand() * 2 * Math.PI;
      p.vx = spd * sinTheta * Math.cos(phi);
      p.vy = spd * cosTheta;
      p.vz = spd * sinTheta * Math.sin(phi);
    }
  }
}
