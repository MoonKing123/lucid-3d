import { Node3D } from '../../../src/core/node3d';
import { Mesh } from '../../../src/renderer/mesh';
import { createPlaneGeometry } from '../../../src/renderer/primitives';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { vec3 } from '../../../src/math/vec3';

/** 地形尺寸（世界单位） */
export const TERRAIN_SIZE = 128;

/**
 * 创建 128×128 大地图地形。
 * 使用 16×16 分段以支持平滑着色，草绿色调 PhongMaterial。
 */
export function createTerrain(): Node3D {
  const root = new Node3D('terrain');

  // 主地面：绿色草地
  const groundGeo = createPlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 16, 16);
  const groundMat = new PhongMaterial({
    diffuse: vec3(0.35, 0.55, 0.25),  // 草绿
    ambient: vec3(0.12, 0.18, 0.08),
    specular: vec3(0.05, 0.05, 0.05),
    shininess: 4,
  });
  const ground = new Mesh(groundGeo, groundMat);
  root.addChild(ground);

  // 高地区块：在地形西北角添加深绿色区域作为视觉区分
  const highlandGeo = createPlaneGeometry(40, 30, 8, 6);
  const highlandMat = new PhongMaterial({
    diffuse: vec3(0.22, 0.45, 0.15),  // 深绿
    ambient: vec3(0.08, 0.15, 0.05),
    specular: vec3(0.03, 0.03, 0.03),
    shininess: 2,
  });
  const highland = new Mesh(highlandGeo, highlandMat);
  highland.position[0] = -40;
  highland.position[1] = 0.01; // 略高于地面，避免 z-fighting
  highland.position[2] = -35;
  root.addChild(highland);

  // 沙漠区块：东南角黄褐色区域
  const desertGeo = createPlaneGeometry(35, 35, 6, 6);
  const desertMat = new PhongMaterial({
    diffuse: vec3(0.75, 0.65, 0.35),  // 黄褐色
    ambient: vec3(0.25, 0.20, 0.10),
    specular: vec3(0.08, 0.08, 0.04),
    shininess: 6,
  });
  const desert = new Mesh(desertGeo, desertMat);
  desert.position[0] = 42;
  desert.position[1] = 0.01;
  desert.position[2] = 38;
  root.addChild(desert);

  return root;
}
