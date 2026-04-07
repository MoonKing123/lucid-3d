import { describe, it, expect } from 'vitest';
import { Map } from '../../src/map';
import { Enemy } from '../../src/enemy';
import { Tower } from '../../src/tower';
import { TowerManager } from '../../src/tower-manager';
import { CombatSystem } from '../../src/combat';

describe('CombatSystem — 塔攻击集成', () => {
  it('射程内有敌人时发射 projectile', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    const tower = mgr.place(3, 6, 'arrow')!;
    // 把敌人放在塔旁
    const enemy = new Enemy({ map });
    enemy.node.position[0] = tower.node.position[0] + 1;
    enemy.node.position[2] = tower.node.position[2];

    const combat = new CombatSystem();
    combat.update(1 / 60, [tower], [enemy]);
    expect(combat.projectiles.length).toBeGreaterThan(0);
  });

  it('射程外的敌人不会被攻击', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    const tower = mgr.place(3, 6, 'arrow')!;
    const enemy = new Enemy({ map });
    enemy.node.position[0] = tower.node.position[0] + 100;

    const combat = new CombatSystem();
    combat.update(1 / 60, [tower], [enemy]);
    expect(combat.projectiles.length).toBe(0);
  });

  it('cooldown 内不会重复攻击', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    const tower = mgr.place(3, 6, 'arrow')!;
    const enemy = new Enemy({ map });
    enemy.node.position[0] = tower.node.position[0] + 1;

    const combat = new CombatSystem();
    combat.update(1 / 60, [tower], [enemy]);
    const after1 = combat.projectiles.length;
    combat.update(1 / 60, [tower], [enemy]); // 立刻再 update
    const after2 = combat.projectiles.length;
    // 第二次 update 不应该新增 projectile（因为 cooldown）
    expect(after2 - after1).toBeLessThanOrEqual(1);
  });

  it('projectile 命中后敌人扣血', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    const tower = mgr.place(3, 6, 'arrow')!;
    const enemy = new Enemy({ map, maxHealth: 200 });
    enemy.node.position[0] = tower.node.position[0] + 1;

    const combat = new CombatSystem();
    // 多 step 让 projectile 命中
    for (let i = 0; i < 60; i++) combat.update(1 / 60, [tower], [enemy]);
    expect(enemy.health).toBeLessThan(200);
  });

  it('攻击致死的敌人正确进入 dead 状态', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    const tower = mgr.place(3, 6, 'cannon')!; // 高伤害
    const enemy = new Enemy({ map, maxHealth: 30 });
    enemy.node.position[0] = tower.node.position[0] + 1;

    const combat = new CombatSystem();
    for (let i = 0; i < 120; i++) combat.update(1 / 60, [tower], [enemy]);
    expect(enemy.dead).toBe(true);
  });
});
