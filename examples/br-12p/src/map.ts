/**
 * Map — BR-12P 基础地图。
 * 创建地面 + 若干墙/障碍物，并将碰撞体注册到 CollisionWorld。
 */

import { Node3D } from '../../../src/core/node3d';
import { Mesh } from '../../../src/renderer/mesh';
import { Geometry } from '../../../src/renderer/geometry';
import { createPlaneGeometry } from '../../../src/renderer/primitives';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { CollisionWorld } from '../../../src/physics/collision';
import { BoxCollider } from '../../../src/physics/box-collider';
import { vec3 } from '../../../src/math/vec3';

/** 地图尺寸（世界单位，正方形） */
export const MAP_SIZE = 64;

/** 环境碰撞层（地面、墙壁） */
export const LAYER_ENVIRONMENT = 2;

/**
 * 在本模块内创建简单的盒体几何（primitives.ts 无 createBoxGeometry）。
 * 6 面各 4 顶点，共 24 顶点、12 三角形。
 */
function createBoxGeometry(w: number, h: number, d: number): Geometry {
  const hw = w / 2, hh = h / 2, hd = d / 2;

  // 6 面顺序：前(+Z)、后(-Z)、顶(+Y)、底(-Y)、右(+X)、左(-X)
  const positions = new Float32Array([
    // 前
    -hw, -hh,  hd,   hw, -hh,  hd,   hw,  hh,  hd,  -hw,  hh,  hd,
    // 后
     hw, -hh, -hd,  -hw, -hh, -hd,  -hw,  hh, -hd,   hw,  hh, -hd,
    // 顶
    -hw,  hh,  hd,   hw,  hh,  hd,   hw,  hh, -hd,  -hw,  hh, -hd,
    // 底
    -hw, -hh, -hd,   hw, -hh, -hd,   hw, -hh,  hd,  -hw, -hh,  hd,
    // 右
     hw, -hh,  hd,   hw, -hh, -hd,   hw,  hh, -hd,   hw,  hh,  hd,
    // 左
    -hw, -hh, -hd,  -hw, -hh,  hd,  -hw,  hh,  hd,  -hw,  hh, -hd,
  ]);

  const normals = new Float32Array([
    0,0,1,  0,0,1,  0,0,1,  0,0,1,   // 前
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,  // 后
    0,1,0,  0,1,0,  0,1,0,  0,1,0,   // 顶
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,  // 底
    1,0,0,  1,0,0,  1,0,0,  1,0,0,   // 右
    -1,0,0, -1,0,0, -1,0,0, -1,0,0,  // 左
  ]);

  const uvs = new Float32Array([
    0,0, 1,0, 1,1, 0,1,  // 前
    0,0, 1,0, 1,1, 0,1,  // 后
    0,0, 1,0, 1,1, 0,1,  // 顶
    0,0, 1,0, 1,1, 0,1,  // 底
    0,0, 1,0, 1,1, 0,1,  // 右
    0,0, 1,0, 1,1, 0,1,  // 左
  ]);

  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,  // 前
     4,  5,  6,   4,  6,  7,  // 后
     8,  9, 10,   8, 10, 11,  // 顶
    12, 13, 14,  12, 14, 15,  // 底
    16, 17, 18,  16, 18, 19,  // 右
    20, 21, 22,  20, 22, 23,  // 左
  ]);

  return new Geometry({ positions, normals, uvs, indices });
}

/** 墙壁配置 */
interface WallConfig {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

const WALL_CONFIGS: WallConfig[] = [
  { x:  10, y: 1, z:   5, w: 2, h: 2, d: 2 },
  { x: -10, y: 1, z:   5, w: 2, h: 2, d: 2 },
  { x:   0, y: 1, z:  15, w: 4, h: 2, d: 1 },
  { x:  15, y: 1, z: -10, w: 1, h: 2, d: 4 },
  { x:  -8, y: 1, z:  -8, w: 2, h: 3, d: 2 },
];

/**
 * 创建 BR-12P 地图：地面 + 若干障碍墙，并注册碰撞体到 CollisionWorld。
 */
export function createMap(world: CollisionWorld): Node3D {
  const root = new Node3D('map');

  // ── 地面 ──
  const groundGeo = createPlaneGeometry(MAP_SIZE, MAP_SIZE, 8, 8);
  const groundMat = new PhongMaterial({
    diffuse: vec3(0.35, 0.55, 0.25),
    ambient: vec3(0.12, 0.18, 0.08),
    specular: vec3(0.05, 0.05, 0.05),
    shininess: 4,
  });
  const ground = new Mesh(groundGeo, groundMat, 'ground');
  root.addChild(ground);

  // 地面碰撞体：紧贴 y=0 平面向下 0.1 厚
  world.addBody(ground, {
    shape: new BoxCollider(
      vec3(MAP_SIZE / 2, 0.05, MAP_SIZE / 2),
      vec3(0, -0.05, 0),
    ),
    layer: LAYER_ENVIRONMENT,
    mask: 0xFFFFFFFF,
  });

  // ── 墙壁 / 障碍物 ──
  const wallMat = new PhongMaterial({
    diffuse: vec3(0.6, 0.5, 0.4),
    ambient: vec3(0.2, 0.15, 0.1),
    specular: vec3(0.1, 0.1, 0.1),
    shininess: 8,
  });

  for (let i = 0; i < WALL_CONFIGS.length; i++) {
    const cfg = WALL_CONFIGS[i];
    const wallGeo = createBoxGeometry(cfg.w, cfg.h, cfg.d);
    const wall = new Mesh(wallGeo, wallMat, `wall-${i}`);
    wall.position[0] = cfg.x;
    wall.position[1] = cfg.y;
    wall.position[2] = cfg.z;
    root.addChild(wall);

    world.addBody(wall, {
      shape: new BoxCollider(
        vec3(cfg.w / 2, cfg.h / 2, cfg.d / 2),
        vec3(0, 0, 0),
      ),
      layer: LAYER_ENVIRONMENT,
      mask: 0xFFFFFFFF,
    });
  }

  return root;
}
