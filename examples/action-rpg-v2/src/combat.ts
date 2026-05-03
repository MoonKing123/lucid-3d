/**
 * CombatSystemV2 — M6.3 战斗系统
 *
 * 近战：TrailRenderer 剑气 + 扇形 hitbox (60°, 1.5m) + TwoBoneIK 脚步贴地
 * 远程：Curve3 CatmullRom 抛物线 + TubeGeometry 弓箭 + IKChain 手抓弓(weight=0.7)
 * 粒子：命中位置 ParticleEmitter.emit(20)
 */

import { Node3D } from '../../../src/core/node3d';
import { TrailRenderer } from '../../../src/renderer/trail';
import { Curve3 } from '../../../src/math/curve3';
import { createTubeGeometry } from '../../../src/renderer/tube-geometry';
import { Mesh } from '../../../src/renderer/mesh';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { ParticleEmitter } from '../../../src/renderer/particle-emitter';
import { IKChain } from '../../../src/animation/ik-chain';
import type { Skeleton } from '../../../src/animation/skeleton';
import { vec3, add, sub, scale, type Vec3 } from '../../../src/math/vec3';
import type { Health } from '../../../src/gameplay/health';

export interface CombatTarget {
  node: Node3D;
  health: Health;
  readonly isDead: boolean;
}

// 近战参数
const SWORD_COOLDOWN  = 0.5;
const SWORD_HALF_ARC  = Math.PI / 6;   // 60° 扇形的半角 (30°)
const SWORD_RANGE     = 1.5;           // 1.5m 半径
const SWORD_DAMAGE    = 25;

// 远程参数
const BOW_COOLDOWN    = 1.0;
const BOW_DAMAGE      = 40;
const BOW_FLIGHT_T    = 1.2;           // 飞行时间(秒)
const BOW_DIST        = 25.0;          // 最大射程
const ARROW_ARC_H     = 2.5;           // 抛物线弧顶高度
const ARROW_HIT_R     = 0.6;           // 命中判定半径

// IK 参数
// 左腿骨骼索引：[l_thigh=2, l_shin=3, l_foot=4]
const L_LEG_BONES = [2, 3, 4] as const;
// 右腿骨骼索引：[r_thigh=5, r_shin=6, r_foot=7]
const R_LEG_BONES = [5, 6, 7] as const;
// 左臂骨骼索引：[l_upper=8, l_lower=9, l_hand=10]
const L_ARM_BONES = [8, 9, 10] as const;

// skeleton 局部空间中各脚骨的 rest 位置偏移(相对 root 骨骼)
const L_FOOT_REST = vec3(-0.15, -1.28, 0);  // root + l_thigh + l_shin + l_foot
const R_FOOT_REST = vec3( 0.15, -1.28, 0);

interface Arrow {
  curve: Curve3;
  progress: number;
  active: boolean;
  node: Node3D;
}

export class CombatSystemV2 {
  // 剑尖节点（挂在玩家节点下）
  private readonly _swordTip: Node3D;

  // 拖尾、粒子
  readonly trail: TrailRenderer;
  readonly particles: ParticleEmitter;

  // IK chains
  private readonly _leftLegIK: IKChain;
  private readonly _rightLegIK: IKChain;
  private readonly _bowHandIK: IKChain;

  private _cooldown = 0;
  private _isAttacking = false;
  private _bowActive = false;
  private _arrows: Arrow[] = [];
  private _enemies: readonly CombatTarget[];

  hitCount = 0;
  lastHitTarget: CombatTarget | null = null;

  /** 替换可命中目标列表（game.ts 初始化后注入 enemy 列表） */
  setTargets(enemies: readonly CombatTarget[]): void {
    this._enemies = enemies;
  }

  constructor(playerNode: Node3D, enemies: readonly CombatTarget[]) {
    this._enemies = enemies;

    // 剑尖挂在玩家右手位置(0.5m 右，1.0m 高，0.5m 前)
    this._swordTip = new Node3D('sword-tip');
    this._swordTip.position[0] = 0.5;
    this._swordTip.position[1] = 1.0;
    this._swordTip.position[2] = 0.5;
    playerNode.addChild(this._swordTip);

    // TrailRenderer 附着剑尖（剑气拖尾）
    this.trail = new TrailRenderer({
      width: 0.35,
      lifetime: 0.35,
      color: vec3(0.4, 0.7, 1.0),
      colorEnd: vec3(0.1, 0.2, 0.8),
    });
    this._swordTip.addChild(this.trail);

    // 粒子爆发：命中效果（maxParticles=40 支持 burst(20)）
    this.particles = new ParticleEmitter({
      maxParticles: 40,
      emissionRate: 0,
      lifetime: { min: 0.3, max: 0.8 },
      speed: { min: 2, max: 7 },
      size: { min: 0.05, max: 0.18 },
      color: vec3(1, 0.7, 0.1),
      colorEnd: vec3(1, 0.1, 0),
      spread: Math.PI / 3,
      gravity: vec3(0, -6, 0),
    });

    // 左腿 IK（脚步贴地）
    this._leftLegIK = new IKChain({
      solver: 'two-bone',
      boneIndices: [...L_LEG_BONES],
      target: vec3(L_FOOT_REST[0], 0, L_FOOT_REST[2]),
      weight: 1.0,
    });

    // 右腿 IK（脚步贴地）
    this._rightLegIK = new IKChain({
      solver: 'two-bone',
      boneIndices: [...R_LEG_BONES],
      target: vec3(R_FOOT_REST[0], 0, R_FOOT_REST[2]),
      weight: 1.0,
    });

    // 左手 IK（手抓弓，weight=0.7 避免完全覆盖动画）
    this._bowHandIK = new IKChain({
      solver: 'two-bone',
      boneIndices: [...L_ARM_BONES],
      target: vec3(-0.5, 1.2, 0.3),
      weight: 0.7,
    });
  }

  get canAttack(): boolean { return this._cooldown <= 0; }
  get isAttacking(): boolean { return this._isAttacking; }
  get bowActive(): boolean { return this._bowActive; }

  /**
   * 近战攻击（鼠标左键）。
   * @param playerPos    玩家世界坐标
   * @param playerForward 玩家朝向（XZ 平面，已归一化）
   */
  meleeAttack(playerPos: Vec3, playerForward: Vec3): boolean {
    if (this._cooldown > 0) return false;
    this._cooldown = SWORD_COOLDOWN;
    this._isAttacking = true;
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

  /**
   * 远程射箭（鼠标右键）。
   * 弓箭沿 Curve3.catmullRom 抛物线飞行，用 TubeGeometry 呈现。
   */
  bowShoot(playerPos: Vec3, playerForward: Vec3): boolean {
    if (this._cooldown > 0) return false;
    this._cooldown = BOW_COOLDOWN;
    this._bowActive = true;

    const startPos = vec3(playerPos[0], playerPos[1] + 1.2, playerPos[2]);
    const endPos   = vec3(
      playerPos[0] + playerForward[0] * BOW_DIST,
      playerPos[1],
      playerPos[2] + playerForward[2] * BOW_DIST,
    );
    const midPos   = vec3(
      (startPos[0] + endPos[0]) / 2,
      startPos[1] + ARROW_ARC_H,
      (startPos[2] + endPos[2]) / 2,
    );

    const curve = new Curve3([startPos, midPos, endPos]);

    // 箭体：短曲线管道 TubeGeometry
    const arrowNode = new Node3D('arrow');
    const arrowCurve = new Curve3([
      vec3(0, 0, -0.2),
      vec3(0, 0,  0),
      vec3(0, 0,  0.2),
    ]);
    const arrowGeom = createTubeGeometry({
      curve: arrowCurve,
      tubularSegments: 6,
      radius: 0.03,
      radialSegments: 5,
    });
    const arrowMat = new PhongMaterial({ emissive: vec3(1, 0.5, 0.1) });
    arrowNode.addChild(new Mesh(arrowGeom, arrowMat));

    const startPt = curve.getPoint(0);
    arrowNode.position[0] = startPt[0];
    arrowNode.position[1] = startPt[1];
    arrowNode.position[2] = startPt[2];

    this._arrows.push({ curve, progress: 0, active: true, node: arrowNode });
    return true;
  }

  /**
   * TwoBoneIK 脚步贴地。
   * 每帧根据地形高度函数调整双腿 IK target 并求解。
   *
   * @param skeleton      玩家骨骼（需含腿部骨骼，见 animations.ts）
   * @param playerPos     玩家世界坐标
   * @param getTerrainY   地面高度函数 (x, z) → y
   */
  applyFootIK(
    skeleton: Skeleton,
    playerPos: Vec3,
    getTerrainY: (x: number, z: number) => number,
  ): void {
    // 脚的 XZ 世界坐标 = 玩家位置 + 骨骼局部偏移
    const lFootX = playerPos[0] + L_FOOT_REST[0];
    const lFootZ = playerPos[2] + L_FOOT_REST[2];
    const rFootX = playerPos[0] + R_FOOT_REST[0];
    const rFootZ = playerPos[2] + R_FOOT_REST[2];

    // 地形高度 → 骨骼局部空间目标（减去玩家 Y）
    const lTargetY = getTerrainY(lFootX, lFootZ) - playerPos[1];
    const rTargetY = getTerrainY(rFootX, rFootZ) - playerPos[1];

    this._leftLegIK.setTarget(vec3(L_FOOT_REST[0], lTargetY, L_FOOT_REST[2]));
    this._rightLegIK.setTarget(vec3(R_FOOT_REST[0], rTargetY, R_FOOT_REST[2]));

    this._leftLegIK.solve(skeleton);
    this._rightLegIK.solve(skeleton);
  }

  /**
   * IKChain 手抓弓：左手 attach 到弓 grip 位置（weight=0.7）。
   *
   * @param skeleton      玩家骨骼
   * @param bowGripWorld  弓 grip 世界坐标
   * @param playerPos     玩家世界坐标（骨骼局部空间原点）
   */
  applyBowHandIK(skeleton: Skeleton, bowGripWorld: Vec3, playerPos: Vec3): void {
    const localTarget = sub(bowGripWorld, playerPos);
    this._bowHandIK.setTarget(localTarget);
    this._bowHandIK.solve(skeleton);
  }

  update(dt: number): void {
    if (this._cooldown > 0) {
      this._cooldown = Math.max(0, this._cooldown - dt);
    }
    if (this._isAttacking && this._cooldown <= 0) {
      this._isAttacking = false;
    }

    // 更新剑气拖尾（攻击期间）
    if (this._isAttacking) {
      this.trail.update(dt);
    }

    // 更新飞行中的弓箭
    let hasActive = false;
    for (const arrow of this._arrows) {
      if (!arrow.active) continue;

      arrow.progress += dt / BOW_FLIGHT_T;
      if (arrow.progress >= 1) {
        arrow.active = false;
        continue;
      }

      hasActive = true;
      const pos = arrow.curve.getPoint(arrow.progress);
      arrow.node.position[0] = pos[0];
      arrow.node.position[1] = pos[1];
      arrow.node.position[2] = pos[2];

      // 命中检测
      for (const target of this._enemies) {
        if (target.isDead) continue;
        const dx = target.node.position[0] - pos[0];
        const dy = target.node.position[1] - pos[1];
        const dz = target.node.position[2] - pos[2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < ARROW_HIT_R) {
          target.health.takeDamage(BOW_DAMAGE);
          this._spawnHitEffect(target.node.position);
          this.lastHitTarget = target;
          this.hitCount++;
          arrow.active = false;
          break;
        }
      }
    }
    if (!hasActive) this._bowActive = false;

    this._arrows = this._arrows.filter(a => a.active);
    this.particles.update(dt);
  }

  private _spawnHitEffect(pos: Vec3): void {
    this.particles.position[0] = pos[0];
    this.particles.position[1] = pos[1] + 0.5;
    this.particles.position[2] = pos[2];
    this.particles.emit(20);
  }
}
