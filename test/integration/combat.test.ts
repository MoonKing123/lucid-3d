/**
 * 集成测试 — M5.3 战斗系统 (Issue #358)
 *
 * 验证：
 * - 玩家可按 1/2 切换近战/远程武器
 * - 近战（剑）：扇形 hitbox 命中 Enemy，Health.takeDamage(25)
 * - 远程（弓）：Curve3 抛物线弹道飞行，命中 Enemy，Health.takeDamage(40)
 * - 攻击冷却时间（剑 0.5s / 弓 1s）
 */

import { describe, it, expect } from 'vitest';
import { Node3D } from '../../src/core/node3d';
import { Health } from '../../src/gameplay/health';
import { vec3 } from '../../src/math/vec3';
import { CombatSystem, type CombatTarget } from '../../examples/action-rpg/src/combat';

const DT = 1 / 60;

/** 创建最简单的 CombatTarget mock */
function makeTarget(x = 0, y = 0, z = 0, maxHp = 100): CombatTarget {
  const node = new Node3D('target');
  node.position[0] = x;
  node.position[1] = y;
  node.position[2] = z;
  const health = new Health(maxHp);
  return { node, health, get isDead() { return health.isDead; } };
}

// ── 1. 武器切换 ──────────────────────────────────────────────────────

describe('CombatSystem — 武器切换', () => {
  it('初始武器为 sword', () => {
    const player = new Node3D('player');
    const system = new CombatSystem(player, []);
    expect(system.weapon).toBe('sword');
  });

  it('switchWeapon("bow") 切换为弓', () => {
    const player = new Node3D('player');
    const system = new CombatSystem(player, []);
    system.switchWeapon('bow');
    expect(system.weapon).toBe('bow');
  });

  it('switchWeapon("sword") 切回剑', () => {
    const player = new Node3D('player');
    const system = new CombatSystem(player, []);
    system.switchWeapon('bow');
    system.switchWeapon('sword');
    expect(system.weapon).toBe('sword');
  });
});

// ── 2. 近战（剑）──────────────────────────────────────────────────────

describe('CombatSystem — 近战（剑）', () => {
  const PLAYER_POS    = vec3(0, 0, 0);
  const PLAYER_FORWARD = vec3(0, 0, 1);  // 朝 +Z

  it('2m 正前方敌人被命中，HP 减少 25', () => {
    const player  = new Node3D('player');
    const target  = makeTarget(0, 0, 2);  // 正前方 2m
    const system  = new CombatSystem(player, [target]);

    const hit = system.attack(PLAYER_POS, PLAYER_FORWARD);

    expect(hit).toBe(true);
    expect(target.health.current).toBe(75);  // 100 - 25
  });

  it('4m 以外的敌人不被命中（超出 3m range）', () => {
    const player = new Node3D('player');
    const target = makeTarget(0, 0, 4);  // 4m，超出范围
    const system = new CombatSystem(player, [target]);

    const hit = system.attack(PLAYER_POS, PLAYER_FORWARD);

    expect(hit).toBe(false);
    expect(target.health.current).toBe(100);
  });

  it('正后方 2m 的敌人不被命中（扇形角度外）', () => {
    const player = new Node3D('player');
    const target = makeTarget(0, 0, -2);  // 正后方
    const system = new CombatSystem(player, [target]);

    const hit = system.attack(PLAYER_POS, PLAYER_FORWARD);

    expect(hit).toBe(false);
    expect(target.health.current).toBe(100);
  });

  it('扇形内多个敌人全部被命中', () => {
    const player  = new Node3D('player');
    const t1 = makeTarget(0, 0, 2);
    const t2 = makeTarget(1, 0, 2);  // 稍偏右，仍在 90° 扇形内
    const system  = new CombatSystem(player, [t1, t2]);

    system.attack(PLAYER_POS, PLAYER_FORWARD);

    expect(t1.health.current).toBeLessThan(100);
    expect(t2.health.current).toBeLessThan(100);
  });

  it('近战冷却期间无法再次攻击', () => {
    const player = new Node3D('player');
    const target = makeTarget(0, 0, 2);
    const system = new CombatSystem(player, [target]);

    system.attack(PLAYER_POS, PLAYER_FORWARD);
    // 冷却期内再次攻击应失败
    const secondHit = system.attack(PLAYER_POS, PLAYER_FORWARD);
    expect(secondHit).toBe(false);
    // 敌人只受到一次伤害
    expect(target.health.current).toBe(75);
  });

  it('冷却结束（0.5s）后可再次攻击', () => {
    const player = new Node3D('player');
    const target = makeTarget(0, 0, 2);
    const system = new CombatSystem(player, [target]);

    system.attack(PLAYER_POS, PLAYER_FORWARD);
    expect(target.health.current).toBe(75);

    // 推进超过 0.5s 冷却（35 帧 ≈ 0.583s，浮点安全）
    for (let i = 0; i < 35; i++) system.update(DT);

    system.attack(PLAYER_POS, PLAYER_FORWARD);
    expect(target.health.current).toBe(50);
  });

  it('hitCount 记录命中次数', () => {
    const player = new Node3D('player');
    const target = makeTarget(0, 0, 2);
    const system = new CombatSystem(player, [target]);

    expect(system.hitCount).toBe(0);
    system.attack(PLAYER_POS, PLAYER_FORWARD);
    expect(system.hitCount).toBe(1);
  });

  it('lastHitTarget 记录最后命中的目标', () => {
    const player = new Node3D('player');
    const target = makeTarget(0, 0, 2);
    const system = new CombatSystem(player, [target]);

    system.attack(PLAYER_POS, PLAYER_FORWARD);
    expect(system.lastHitTarget).toBe(target);
  });
});

// ── 3. 远程（弓）──────────────────────────────────────────────────────

describe('CombatSystem — 远程（弓）', () => {
  it('攻击后弓的冷却为 1s，canAttack 为 false', () => {
    const player = new Node3D('player');
    const system = new CombatSystem(player, []);
    system.switchWeapon('bow');

    system.attack(vec3(0, 0, 0), vec3(0, 0, 1));
    expect(system.canAttack).toBe(false);
    expect(system.activeCooldown).toBeGreaterThan(0.9);
  });

  it('弓射出的箭在 1s 飞行后命中正前方 20m 处的敌人', () => {
    const player = new Node3D('player');
    // 敌人放在弓箭的目标位置（正前方 20m）
    const target = makeTarget(0, 0, 20);
    const system = new CombatSystem(player, [target]);
    system.switchWeapon('bow');

    system.attack(vec3(0, 0, 0), vec3(0, 0, 1));

    // 推进约 1s（箭飞行完毕前的最后几帧一定经过目标点附近）
    for (let i = 0; i < 60; i++) system.update(DT);

    expect(target.health.current).toBe(60);  // 100 - 40
    expect(system.hitCount).toBeGreaterThanOrEqual(1);
  });

  it('弓箭命中后敌人 HP 减少 40', () => {
    const player = new Node3D('player');
    const target = makeTarget(0, 0, 20);
    const system = new CombatSystem(player, [target]);
    system.switchWeapon('bow');

    system.attack(vec3(0, 0, 0), vec3(0, 0, 1));
    for (let i = 0; i < 60; i++) system.update(DT);

    const damage = 100 - target.health.current;
    expect(damage).toBe(40);
  });

  it('弓箭不命中路径外的敌人（侧面 10m）', () => {
    const player = new Node3D('player');
    // 敌人在侧面，不在箭的路径上
    const target = makeTarget(10, 0, 10);
    const system = new CombatSystem(player, [target]);
    system.switchWeapon('bow');

    system.attack(vec3(0, 0, 0), vec3(0, 0, 1));
    for (let i = 0; i < 60; i++) system.update(DT);

    // 侧面 10m 处不应被命中（弹道是 Z 轴方向）
    expect(target.health.current).toBe(100);
  });

  it('弓冷却期间无法再次射击', () => {
    const player = new Node3D('player');
    const system = new CombatSystem(player, []);
    system.switchWeapon('bow');

    const first  = system.attack(vec3(0, 0, 0), vec3(0, 0, 1));
    const second = system.attack(vec3(0, 0, 0), vec3(0, 0, 1));

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});

// ── 4. 综合：两种武器各命中至少 1 个 Enemy ──────────────────────────

describe('CombatSystem — 两种武器命中验证', () => {
  it('剑和弓各能命中至少 1 个敌人并扣血', () => {
    const player = new Node3D('player');
    // 近战目标偏侧方（不在 Z 轴弓箭路径上），仍在 90° 扇形内
    const meleeTgt = makeTarget(1, 0, 1.5);  // 距离 1.8m，斜前方
    // 弓箭目标在正前方 20m（Z 轴，不被近战波及）
    const bowTgt   = makeTarget(0, 0, 20);

    const system = new CombatSystem(player, [meleeTgt, bowTgt]);
    const forward = vec3(0, 0, 1);
    const pos     = vec3(0, 0, 0);

    // 近战攻击
    system.switchWeapon('sword');
    system.attack(pos, forward);
    expect(meleeTgt.health.current).toBeLessThan(100);

    // 等近战冷却结束（35 帧 ≈ 0.583s）
    for (let i = 0; i < 35; i++) system.update(DT);

    system.switchWeapon('bow');
    system.attack(pos, forward);
    // 等待弓箭飞行完毕
    for (let i = 0; i < 60; i++) system.update(DT);

    expect(bowTgt.health.current).toBeLessThan(100);
    expect(system.hitCount).toBeGreaterThanOrEqual(2);
  });
});
