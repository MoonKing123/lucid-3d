import { Node3D } from '../../../src/core/node3d';
import { Mesh } from '../../../src/renderer/mesh';
import { createPlaneGeometry } from '../../../src/renderer/primitives';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { CollisionWorld } from '../../../src/physics/collision';
import { vec3 } from '../../../src/math/vec3';

export const TERRAIN_SIZE = 100;

/**
 * 创建地形：XZ 平面 + 碰撞体。
 * 返回场景节点（headless 模式也会创建节点，但无渲染器时不会 draw）。
 * 同时向 CollisionWorld 注册地面静态体。
 */
export function createTerrain(world: CollisionWorld): Node3D {
  const root = new Node3D('terrain');

  // 地面 mesh（仅渲染模式使用，headless 时节点存在但不会被绘制）
  const geo = createPlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 10, 10);
  const mat = new PhongMaterial({
    diffuse: vec3(0.35, 0.55, 0.25),
    ambient: vec3(0.1, 0.15, 0.08),
  });
  const ground = new Mesh(geo, mat);
  ground.name = 'ground';
  root.addChild(ground);

  // 注册地面碰撞体（半高 0，topY = node.position[1] = 0）
  world.addStaticBody(
    { center: vec3(0, 0, 0), halfExtents: vec3(TERRAIN_SIZE / 2, 0, TERRAIN_SIZE / 2) },
    { name: 'ground-collider', layer: 1 },
  );

  return root;
}
