import { Node3D } from '../../../src/core/node3d';
import { Mesh } from '../../../src/renderer/mesh';
import { createPlaneGeometry } from '../../../src/renderer/primitives';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { CollisionWorld } from '../../../src/physics/collision';
import { vec3 } from '../../../src/math/vec3';

export const TERRAIN_SIZE = 100;

export function createTerrain(world: CollisionWorld): Node3D {
  const root = new Node3D('terrain');

  const geo = createPlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 10, 10);
  const mat = new PhongMaterial({
    diffuse: vec3(0.35, 0.55, 0.25),
    ambient: vec3(0.1, 0.15, 0.08),
  });
  const ground = new Mesh(geo, mat);
  ground.name = 'ground';
  root.addChild(ground);

  world.addStaticBody(
    { center: vec3(0, 0, 0), halfExtents: vec3(TERRAIN_SIZE / 2, 0, TERRAIN_SIZE / 2) },
    { name: 'ground-collider', layer: 1 },
  );

  return root;
}
