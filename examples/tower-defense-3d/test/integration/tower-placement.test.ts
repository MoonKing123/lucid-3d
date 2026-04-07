import { describe, it, expect } from 'vitest';
import { Map } from '../../src/map';
import { TowerManager } from '../../src/tower-manager';

describe('TowerManager — 塔放置系统', () => {
  it('在空闲 walkable cell 上放置成功', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    const tower = mgr.place(1, 1, 'arrow');
    expect(tower).not.toBeNull();
    expect(mgr.towers.length).toBe(1);
    expect(mgr.isOccupied(1, 1)).toBe(true);
  });

  it('已占用 cell 不能重复放置', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    mgr.place(1, 1, 'arrow');
    const second = mgr.place(1, 1, 'cannon');
    expect(second).toBeNull();
    expect(mgr.towers.length).toBe(1);
  });

  it('障碍 cell 不能放置（路径已被预设阻塞）', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    // M2.1 中障碍在 x=4, y=2..h-2
    const tower = mgr.place(4, 5, 'arrow');
    expect(tower).toBeNull();
  });

  it('越界 cell 不能放置', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    expect(mgr.place(-1, 0, 'arrow')).toBeNull();
    expect(mgr.place(0, 999, 'arrow')).toBeNull();
  });

  it('remove 移除塔后 cell 重新空闲', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    mgr.place(1, 1, 'arrow');
    expect(mgr.remove(1, 1)).toBe(true);
    expect(mgr.isOccupied(1, 1)).toBe(false);
    expect(mgr.towers.length).toBe(0);
  });

  it('Tower 世界坐标位于对应 grid cell 上', () => {
    const map = new Map();
    const mgr = new TowerManager(map);
    const tower = mgr.place(2, 3, 'arrow')!;
    const expected = map.gridToWorld(2, 3);
    expect(tower.node.position[0]).toBeCloseTo(expected[0]);
    expect(tower.node.position[2]).toBeCloseTo(expected[2]);
  });
});
