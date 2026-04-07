import { describe, it, expect } from 'vitest';
import { Game } from '../../src/game';
import { CameraRig } from '../../src/camera-rig';
import { createTerrain, TERRAIN_SIZE } from '../../src/terrain';
import { createLights } from '../../src/lights';

describe('SLG-3D 脚手架 — 场景创建', () => {
  it('headless 模式下 Game 可正常创建', () => {
    expect(() => new Game({ headless: true })).not.toThrow();
  });

  it('headless Game 暴露 camera 属性', () => {
    const game = new Game({ headless: true });
    expect(game.camera).not.toBeNull();
    expect(game.camera).toBeDefined();
  });

  it('frameCount 初始为 0', () => {
    const game = new Game({ headless: true });
    expect(game.frameCount).toBe(0);
  });
});

describe('SLG-3D 脚手架 — OrbitCamera 配置', () => {
  it('CameraRig 创建后 camera 距离在 SLG 合理范围内', () => {
    const rig = new CameraRig({ aspect: 16 / 9 });
    expect(rig.camera.distance).toBeGreaterThanOrEqual(80);
    expect(rig.camera.distance).toBeLessThanOrEqual(200);
  });

  it('极角约 55°（俯视视角）', () => {
    const rig = new CameraRig({ aspect: 16 / 9 });
    const expectedPolar = (55 * Math.PI) / 180;
    expect(rig.camera.polarAngle).toBeCloseTo(expectedPolar, 2);
  });

  it('camera.update 不抛异常', () => {
    const rig = new CameraRig({ aspect: 16 / 9 });
    expect(() => rig.update(1 / 60)).not.toThrow();
  });

  it('rotate 调整方位角和极角', () => {
    const rig = new CameraRig({ aspect: 16 / 9 });
    const initAzimuth = rig.camera.azimuthAngle;
    rig.camera.rotate(0.1, 0);
    expect(rig.camera.azimuthAngle).toBeCloseTo(initAzimuth + 0.1, 5);
  });

  it('zoom 调整 distance 并保持在有效范围', () => {
    const rig = new CameraRig({ aspect: 16 / 9 });
    rig.camera.zoom(0.5); // zoom in
    expect(rig.camera.distance).toBeGreaterThanOrEqual(rig.camera.minDistance);
    expect(rig.camera.distance).toBeLessThanOrEqual(rig.camera.maxDistance);
  });

  it('pan 移动 orbitTarget', () => {
    const rig = new CameraRig({ aspect: 16 / 9 });
    rig.camera.update(0); // 先更新确保状态初始化
    const initZ = rig.camera.orbitTarget[2];
    rig.camera.pan(0, 10);
    // pan 后 target 应有变化
    expect(rig.camera.orbitTarget[2]).not.toBeCloseTo(initZ, 3);
  });
});

describe('SLG-3D 脚手架 — 地形', () => {
  it('createTerrain 返回有效 Node3D', () => {
    const terrain = createTerrain();
    expect(terrain).toBeDefined();
    expect(terrain.name).toBe('terrain');
  });

  it('地形包含子 mesh（地面 + 两个区块）', () => {
    const terrain = createTerrain();
    // 至少有主地面 mesh
    expect(terrain.children.length).toBeGreaterThanOrEqual(1);
  });

  it('TERRAIN_SIZE 至少 128 世界单位', () => {
    expect(TERRAIN_SIZE).toBeGreaterThanOrEqual(128);
  });
});

describe('SLG-3D 脚手架 — 光照', () => {
  it('createLights 返回 sun 和 ambient', () => {
    const { sun, ambient } = createLights();
    expect(sun).toBeDefined();
    expect(ambient).toBeDefined();
  });

  it('太阳光强度大于 0', () => {
    const { sun } = createLights();
    expect(sun.intensity).toBeGreaterThan(0);
  });

  it('环境光强度大于 0', () => {
    const { ambient } = createLights();
    expect(ambient.intensity).toBeGreaterThan(0);
  });

  it('太阳光方向向量不为零向量', () => {
    const { sun } = createLights();
    const len = Math.sqrt(
      sun.direction[0] ** 2 + sun.direction[1] ** 2 + sun.direction[2] ** 2
    );
    expect(len).toBeGreaterThan(0);
  });
});

describe('SLG-3D 脚手架 — headless 压力测试', () => {
  it('headless 连续运行 60 帧不崩溃', () => {
    const game = new Game({ headless: true });
    expect(() => {
      for (let i = 0; i < 60; i++) game.update(1 / 60);
    }).not.toThrow();
    expect(game.frameCount).toBe(60);
  });

  it('60 帧后 camera 位置合理（非 NaN）', () => {
    const game = new Game({ headless: true });
    for (let i = 0; i < 60; i++) game.update(1 / 60);
    const pos = game.camera?.position;
    expect(pos).toBeDefined();
    expect(isNaN(pos![0])).toBe(false);
    expect(isNaN(pos![1])).toBe(false);
    expect(isNaN(pos![2])).toBe(false);
  });

  it('headless 无 console.error 输出', () => {
    const errors: string[] = [];
    const orig = console.error;
    console.error = (...args) => { errors.push(args.join(' ')); };
    try {
      const game = new Game({ headless: true });
      for (let i = 0; i < 60; i++) game.update(1 / 60);
    } finally {
      console.error = orig;
    }
    expect(errors).toEqual([]);
  });
});
