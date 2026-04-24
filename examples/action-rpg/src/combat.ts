/**
 * CombatSystem — 战斗系统，支持近战（剑气）和远程（弓箭弹道）。
 *
 * 近战：扇形 hitbox (3m × 90°) + TrailRenderer 剑气 + 粒子爆发 + Health.takeDamage(25)
 * 远程：Curve3 CatmullRom 抛物线弹道 + TubeGeometry 箭体 + 粒子爆发 + Health.takeDamage(40)
 */

import { Node3D } from '../../../src/core/node3d';
import { TrailRenderer } from '../../../src/renderer/trail';
import { Curve3 } from '../../../src/math/curve3';
import { createTubeGeometry } from '../../../src/renderer/tube-geometry';
import { Mesh } from '../../../src/renderer/mesh';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { ParticleEmitter } from '../../../src/renderer/particle-emitter';
import { vec3, type Vec3 } from '../../../src/math/vec3';
import type { Health } from '../../../src/gameplay/health';

export type WeaponType = 'sword' | 'bow';

export interface CombatTarget {
  node: Node3D;
  health: Health;
  readonly isDead: boolean;
}

const SWORD_COOLDOWN = 0.5;
const BOW_COOLDOWN   = 1.0;
const SWORD_RANGE    = 3.0;
const SWORD_HALF_ARC = Math.PI / 4;  // 90° 扇形的半角
const SWORD_DAMAGE   = 25;
const BOW_DAMAGE     = 40;
const BOW_FLIGHT_T   = 1.0;
const BOW_DIST       = 20.0;
const ARROW_HIT_R    = 0.5;
const ARROW_ARC_H    = 2.0;  // 抛物线弧顶高度

interface Arrow {
  curve: Curve3;
  progress: number;
  active: boolean;
  node: Node3D;
}

export class CombatSystem {
  weapon: WeaponType = 'sword';

  private _cooldown = 0;
  private _arrows: Arrow[] = [];
  private _enemies: readonly CombatTarget[];
  private _swordTip: Node3D;

  readonly trail: TrailRenderer;
  readonly particles: ParticleEmitter;

  /** 命中计数，供测试观察 */
  hitCount = 0;
  lastHitTarget: CombatTarget | null = null;

  constructor(playerNode: Node3D, enemies: readonly CombatTarget[]) {
    this._enemies = enemies;

    // 剑尖节点（挂在玩家节点下，稍微偏右前方）
    this._swordTip = new Node3D('sword-tip');
    this._swordTip.position[0] = 0.5;
    this._swordTip.position[1] = 1.0;
    this._swordTip.position[2] = 0.5;
    playerNode.addChild(this._swordTip);

    // TrailRenderer 附着剑尖
    this.trail = new TrailRenderer({
      width: 0.4,
      lifetime: 0.4,
      color: vec3(0.3, 0.6, 1.0),
      colorEnd: vec3(0.1, 0.2, 0.8),
    });
    this._swordTip.addChild(this.trail);

    // 粒子爆发：命中效果
    this.particles = new ParticleEmitter({
      maxParticles: 40,
      emissionRate: 0,
      lifetime: { min: 0.2, max: 0.5 },
      speed: { min: 2, max: 6 },
      size: { min: 0.05, max: 0.2 },
      color: vec3(1, 0.7, 0.1),
      colorEnd: vec3(1, 0.1, 0),
      spread: Math.PI / 3,
      gravity: vec3(0, -5, 0),
    });
  }

  get canAttack(): boolean { return this._cooldown <= 0; }
  get activeCooldown(): number { return this._cooldown; }

  switchWeapon(type: WeaponType): void {
    this.weapon = type;
  }

  /**
   * 发动攻击。
   * @param playerPos    玩家当前世界坐标
   * @param playerForward 玩家朝向（归一化，XZ 平面）
   * @returns 是否成功攻击（冷却未到期时返回 false）
   */
  attack(playerPos: Vec3, playerForward: Vec3): boolean {
    if (this._cooldown > 0) return false;
    return this.weapon === 'sword'
      ? this._meleeAttack(playerPos, playerForward)
      : this._bowAttack(playerPos, playerForward);
  }

  update(dt: number): void {
    if (this._cooldown > 0) this._cooldown = Math.max(0, this._cooldown - dt);

    // 近战冷却期间更新剑气轨迹
    if (this.weapon === 'sword' && this._cooldown > 0) {
      this.trail.update(dt);
    }

    // 更新飞行中的弓箭
    for (const arrow of this._arrows) {
      if (!arrow.active) continue;

      arrow.progress += dt / BOW_FLIGHT_T;
      if (arrow.progress >= 1) {
        arrow.active = false;
        continue;
      }

      const pos = arrow.curve.getPoint(arrow.progress);
      arrow.node.position[0] = pos[0];
      arrow.node.position[1] = pos[1];
      arrow.node.position[2] = pos[2];

      // 每帧检测与所有敌人的距离
      for (const target of this._enemies) {
        if (target.isDead) continue;

        const dx = target.node.position[0] - pos[0];
        const dy = target.node.position[1] - pos[1];
        const dz = target.node.position[2] - pos[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < ARROW_HIT_R) {
          target.health.takeDamage(BOW_DAMAGE);
          this._spawnHitEffect(target.node.position);
          this.lastHitTarget = target;
          this.hitCount++;
          arrow.active = false;
          break;
        }
      }
    }

    // 清理已失活的箭
    this._arrows = this._arrows.filter(a => a.active);

    this.particles.update(dt);
  }

  // ── 私有方法 ────────────────────────────────────────────

  private _meleeAttack(playerPos: Vec3, playerForward: Vec3): boolean {
    this._cooldown = SWORD_COOLDOWN;
    this.trail.reset();

    const cosCone = Math.cos(SWORD_HALF_ARC);
    let hitAny = false;

    for (const target of this._enemies) {
      if (target.isDead) continue;

      const dx = target.node.position[0] - playerPos[0];
      const dz = target.node.position[2] - playerPos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > SWORD_RANGE) continue;

      // XZ 平面扇形角度检测
      const nx = dist > 1e-6 ? dx / dist : 0;
      const nz = dist > 1e-6 ? dz / dist : 0;
      const cosAngle = nx * playerForward[0] + nz * playerForward[2];
      if (cosAngle < cosCone) continue;

      target.health.takeDamage(SWORD_DAMAGE);
      this._spawnHitEffect(target.node.position);
      this.lastHitTarget = target;
      this.hitCount++;
      hitAny = true;
    }

    return hitAny;
  }

  private _bowAttack(playerPos: Vec3, playerForward: Vec3): boolean {
    this._cooldown = BOW_COOLDOWN;

    const startPos = vec3(playerPos[0], playerPos[1], playerPos[2]);
    const endPos   = vec3(
      playerPos[0] + playerForward[0] * BOW_DIST,
      playerPos[1],
      playerPos[2] + playerForward[2] * BOW_DIST,
    );
    const midPos = vec3(
      (startPos[0] + endPos[0]) / 2,
      startPos[1] + ARROW_ARC_H,
      (startPos[2] + endPos[2]) / 2,
    );

    const curve = new Curve3([startPos, midPos, endPos]);

    // 创建箭体节点（TubeGeometry 管道 + PhongMaterial emissive）
    const arrowNode = new Node3D('arrow');
    arrowNode.position[0] = startPos[0];
    arrowNode.position[1] = startPos[1];
    arrowNode.position[2] = startPos[2];

    // 生成简短箭体几何（0.4m 长的微型曲线管道）
    const arrowCurve = new Curve3([
      vec3(0, 0, -0.2),
      vec3(0, 0,  0.0),
      vec3(0, 0,  0.2),
    ]);
    const arrowGeom = createTubeGeometry({
      curve: arrowCurve,
      tubularSegments: 8,
      radius: 0.04,
      radialSegments: 6,
    });
    const arrowMat = new PhongMaterial({
      emissive: vec3(1, 0.5, 0.1),
    });
    arrowNode.addChild(new Mesh(arrowGeom, arrowMat));

    this._arrows.push({ curve, progress: 0, active: true, node: arrowNode });
    return true;
  }

  private _spawnHitEffect(pos: Vec3): void {
    this.particles.position[0] = pos[0];
    this.particles.position[1] = pos[1] + 0.5;
    this.particles.position[2] = pos[2];
    this.particles.emit(15);
  }
}
