import { describe, it, expect } from 'vitest';
import { Map } from '../../src/map';
import { CameraRig } from '../../src/camera-rig';

describe('Map — 网格地图集成测试', () => {
  it('默认 12x12 grid 含可达路径', () => {
    const map = new Map();
    expect(map.grid.width).toBe(12);
    expect(map.grid.height).toBe(12);
    expect(map.path.length).toBeGreaterThan(0);
    // path 起点和终点正确
    expect(map.path[0]).toMatchObject({ x: map.start.x, y: map.start.y });
    expect(map.path[map.path.length - 1]).toMatchObject({ x: map.end.x, y: map.end.y });
  });

  it('grid 坐标到世界坐标转换正确', () => {
    const map = new Map({ width: 4, height: 4, cellSize: 2 });
    const [x, _y, z] = map.gridToWorld(0, 0);
    // grid 中心 = 世界 (0,0,0)，所以 (0,0) 应该是 (-3, _, -3)
    expect(x).toBeCloseTo(-3);
    expect(z).toBeCloseTo(-3);
    const [x2, , z2] = map.gridToWorld(3, 3);
    expect(x2).toBeCloseTo(3);
    expect(z2).toBeCloseTo(3);
  });

  it('障碍单元格不可行走', () => {
    const map = new Map();
    expect(map.grid.isWalkable(4, 5)).toBe(false);
  });

  it('Map.node 是有效 Node3D', () => {
    const map = new Map();
    expect(map.node.name).toBe('map');
  });
});

describe('CameraRig — OrbitCamera 集成测试', () => {
  it('创建后 camera 不为空且 distance 合理', () => {
    const rig = new CameraRig({ aspect: 16 / 9 });
    expect(rig.camera).toBeDefined();
    // OrbitCamera 应该已经计算出合理的世界位置
    expect(typeof rig.camera.position[0]).toBe('number');
    expect(typeof rig.camera.position[1]).toBe('number');
    expect(typeof rig.camera.position[2]).toBe('number');
  });

  it('update 不抛异常', () => {
    const rig = new CameraRig({ aspect: 16 / 9 });
    expect(() => rig.update(1 / 60)).not.toThrow();
  });
});
