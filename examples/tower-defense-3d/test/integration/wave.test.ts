import { describe, it, expect } from 'vitest';
import { Map } from '../../src/map';
import { Enemy } from '../../src/enemy';
import { WaveSpawner } from '../../src/wave-spawner';

describe('Enemy — NavAgent 路径跟随', () => {
  it('生成在路径起点', () => {
    const map = new Map();
    const enemy = new Enemy({ map });
    const [sx, , sz] = map.gridToWorld(map.start.x, map.start.y);
    expect(enemy.node.position[0]).toBeCloseTo(sx);
    expect(enemy.node.position[2]).toBeCloseTo(sz);
  });

  it('update 后向终点移动', () => {
    const map = new Map();
    const enemy = new Enemy({ map, speed: 5 });
    const x0 = enemy.node.position[0];
    for (let i = 0; i < 60; i++) enemy.update(1 / 60);
    expect(enemy.node.position[0]).toBeGreaterThan(x0);
  });

  it('受伤至 0 进入 dead 状态', () => {
    const map = new Map();
    const enemy = new Enemy({ map, maxHealth: 50 });
    enemy.takeDamage(20);
    expect(enemy.dead).toBe(false);
    expect(enemy.health).toBe(30);
    enemy.takeDamage(50);
    expect(enemy.dead).toBe(true);
    expect(enemy.health).toBe(0);
  });

  it('沿足够长时间最终到达终点', () => {
    const map = new Map();
    const enemy = new Enemy({ map, speed: 10 });
    for (let i = 0; i < 600; i++) enemy.update(1 / 60); // 10 秒
    expect(enemy.reachedEnd).toBe(true);
  });
});

describe('WaveSpawner — 波次出怪', () => {
  it('按 interval 生成正确数量的敌人', () => {
    const map = new Map();
    const spawner = new WaveSpawner(map, [
      { count: 5, interval: 0.5, enemyHealth: 100 },
    ]);
    // 模拟 3 秒：应该生成 5 个敌人
    for (let i = 0; i < 180; i++) spawner.update(1 / 60);
    expect(spawner.enemies.length).toBe(5);
  });

  it('多波次依次执行', () => {
    const map = new Map();
    const spawner = new WaveSpawner(map, [
      { count: 2, interval: 0.5, enemyHealth: 50 },
      { count: 3, interval: 0.5, enemyHealth: 80 },
    ]);
    for (let i = 0; i < 600; i++) spawner.update(1 / 60); // 10 秒
    expect(spawner.enemies.length).toBe(5);
  });

  it('activeEnemies 反映当前活敌人数', () => {
    const map = new Map();
    const spawner = new WaveSpawner(map, [
      { count: 3, interval: 0.5, enemyHealth: 100 },
    ]);
    for (let i = 0; i < 180; i++) spawner.update(1 / 60);
    expect(spawner.activeEnemies).toBeLessThanOrEqual(3);
    spawner.enemies[0].takeDamage(999);
    expect(spawner.activeEnemies).toBeLessThan(3);
  });
});
