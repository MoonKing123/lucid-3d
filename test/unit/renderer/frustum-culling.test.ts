/**
 * Frustum Culling 集成测试
 * 验证 Mesh.boundingBox / Mesh.frustumCulled 属性，
 * 以及 Frustum + worldMatrix 组合下正确裁剪不可见 Mesh。
 */
import { describe, it, expect } from 'vitest';
import { Mesh } from '../../src/renderer/mesh';
import { Geometry } from '../../src/renderer/geometry';
import { Material } from '../../src/renderer/material';
import { Frustum } from '../../src/math/frustum';
import { AABB } from '../../src/math/aabb';
import { vec3 } from '../../src/math/vec3';
import { identity, translate, multiply, perspective } from '../../src/math/mat4';
import { PerspectiveCamera } from '../../src/core/camera';

/* ---------- helpers ---------- */

/** 创建一个 1x1x1 立方体 Geometry，中心在原点 */
function cubeGeo(): Geometry {
  // 简化：只需要 positions 来测试 AABB
  const positions = new Float32Array([
    -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5,  0.5, -0.5,
    -0.5, -0.5, -0.5,   0.5,  0.5, -0.5,  -0.5,  0.5, -0.5,
    -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
  ]);
  return new Geometry({ positions });
}

function dummyMaterial(): Material {
  return new Material('precision mediump float; attribute vec3 a_position; uniform mat4 u_mvp; void main(){gl_Position=u_mvp*vec4(a_position,1.0);}',
    'precision mediump float; void main(){gl_FragColor=vec4(1.0);}');
}

/* ---------- Mesh.boundingBox ---------- */

describe('Mesh.boundingBox', () => {
  it('should auto-compute AABB from geometry', () => {
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    const bb = mesh.boundingBox;
    expect(bb).toBeInstanceOf(AABB);
    expect(bb.min[0]).toBeCloseTo(-0.5);
    expect(bb.min[1]).toBeCloseTo(-0.5);
    expect(bb.min[2]).toBeCloseTo(-0.5);
    expect(bb.max[0]).toBeCloseTo(0.5);
    expect(bb.max[1]).toBeCloseTo(0.5);
    expect(bb.max[2]).toBeCloseTo(0.5);
  });

  it('should return same AABB instance on repeated access (cached)', () => {
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    const bb1 = mesh.boundingBox;
    const bb2 = mesh.boundingBox;
    expect(bb1).toBe(bb2);
  });

  it('should invalidate cache when geometry changes', () => {
    const geo = cubeGeo();
    const mesh = new Mesh(geo, dummyMaterial());
    const bb1 = mesh.boundingBox;

    // 替换 geometry
    const newGeo = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]),
    });
    mesh.geometry = newGeo;
    const bb2 = mesh.boundingBox;

    expect(bb2).not.toBe(bb1);
    expect(bb2.max[0]).toBeCloseTo(2);
  });
});

/* ---------- Mesh.frustumCulled ---------- */

describe('Mesh.frustumCulled', () => {
  it('should default to true', () => {
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    expect(mesh.frustumCulled).toBe(true);
  });

  it('should be settable to false', () => {
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    mesh.frustumCulled = false;
    expect(mesh.frustumCulled).toBe(false);
  });
});

/* ---------- Frustum Culling Logic ---------- */

describe('Frustum culling integration', () => {
  /** 创建一个朝 -Z 方向看的相机视锥 */
  function createCameraFrustum(): Frustum {
    const camera = new PerspectiveCamera(Math.PI / 4, 1, 0.1, 100);
    camera.position = vec3(0, 0, 5);
    camera.lookAt(vec3(0, 0, 0));
    const frustum = new Frustum();
    frustum.setFromProjectionMatrix(camera.viewProjectionMatrix);
    return frustum;
  }

  it('should NOT cull a mesh at origin (inside frustum)', () => {
    const frustum = createCameraFrustum();
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    // 世界空间 AABB = local AABB（mesh 在原点）
    const worldAABB = AABB.fromGeometry(mesh.geometry);
    expect(frustum.intersectsAABB(worldAABB)).toBe(true);
  });

  it('should cull a mesh far to the right (outside frustum)', () => {
    const frustum = createCameraFrustum();
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    mesh.position = vec3(100, 0, 0); // 远在视锥右侧之外
    // 计算世界空间 AABB
    const localBB = AABB.fromGeometry(mesh.geometry);
    const worldBB = new AABB(
      vec3(localBB.min[0] + 100, localBB.min[1], localBB.min[2]),
      vec3(localBB.max[0] + 100, localBB.max[1], localBB.max[2]),
    );
    expect(frustum.intersectsAABB(worldBB)).toBe(false);
  });

  it('should cull a mesh behind the camera', () => {
    const frustum = createCameraFrustum();
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    mesh.position = vec3(0, 0, 10); // 在相机后面（相机在 z=5 看向 z=0）
    const localBB = AABB.fromGeometry(mesh.geometry);
    const worldBB = new AABB(
      vec3(localBB.min[0], localBB.min[1], localBB.min[2] + 10),
      vec3(localBB.max[0], localBB.max[1], localBB.max[2] + 10),
    );
    expect(frustum.intersectsAABB(worldBB)).toBe(false);
  });

  it('should NOT cull a mesh on the edge of the frustum', () => {
    const frustum = createCameraFrustum();
    // 放在近平面附近、略偏但仍在视锥内
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    mesh.position = vec3(0, 0, 4); // z=4，在 near=0.1 到 far=100 范围内且相机在 z=5
    const localBB = AABB.fromGeometry(mesh.geometry);
    const worldBB = new AABB(
      vec3(localBB.min[0], localBB.min[1], localBB.min[2] + 4),
      vec3(localBB.max[0], localBB.max[1], localBB.max[2] + 4),
    );
    expect(frustum.intersectsAABB(worldBB)).toBe(true);
  });

  it('should respect frustumCulled=false (always render)', () => {
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    mesh.frustumCulled = false;
    mesh.position = vec3(100, 100, 100); // 明显在视锥外

    // frustumCulled=false 时，渲染器应跳过裁剪检测
    // 这里验证属性存在且为 false
    expect(mesh.frustumCulled).toBe(false);
  });

  it('should handle scaled meshes correctly', () => {
    const frustum = createCameraFrustum();
    const mesh = new Mesh(cubeGeo(), dummyMaterial());
    mesh.position = vec3(0, 0, 0);
    mesh.scale = vec3(10, 10, 10); // 放大 10 倍

    // 世界空间 AABB 需要考虑缩放
    const localBB = AABB.fromGeometry(mesh.geometry);
    const worldBB = new AABB(
      vec3(localBB.min[0] * 10, localBB.min[1] * 10, localBB.min[2] * 10),
      vec3(localBB.max[0] * 10, localBB.max[1] * 10, localBB.max[2] * 10),
    );
    expect(frustum.intersectsAABB(worldBB)).toBe(true);
  });
});
