/**
 * 引擎性能基准测试
 * 使用 vitest bench 模式运行：pnpm vitest bench
 *
 * 覆盖：
 * - 数学运算吞吐量（Mat4, Vec3, Quat）
 * - 场景遍历性能
 * - 视锥裁剪吞吐量
 * - AABB 计算
 * - 骨骼矩阵更新
 *
 * CI 集成：可通过 --outputJson 导出基准数据，
 * 对比历史结果检测 > 20% 的性能回退。
 */
import { bench, describe } from 'vitest';
import { multiply, perspective, identity } from '../../src/math/mat4';
import { vec3, normalize, cross, dot } from '../../src/math/vec3';
import { slerp } from '../../src/math/quat';
import { Frustum } from '../../src/math/frustum';
import { AABB } from '../../src/math/aabb';
import { Node3D } from '../../src/core/node3d';
import { Scene } from '../../src/core/scene';
import { Skeleton, type BoneData } from '../../src/animation/skeleton';
import { Geometry } from '../../src/renderer/geometry';

/* ── 数学运算 ──────────────────────────────────────────────────── */

describe('Math operations throughput', () => {
  const a = perspective(Math.PI / 4, 1.33, 0.1, 100);
  const b = perspective(Math.PI / 3, 1.77, 0.5, 500);

  bench('Mat4.multiply × 10000', () => {
    for (let i = 0; i < 10000; i++) {
      multiply(a, b);
    }
  });

  bench('Mat4.perspective × 10000', () => {
    for (let i = 0; i < 10000; i++) {
      perspective(Math.PI / 4, 1.33, 0.1, 100);
    }
  });

  const v = vec3(3, 4, 0);

  bench('Vec3.normalize × 10000', () => {
    for (let i = 0; i < 10000; i++) {
      normalize(v);
    }
  });

  bench('Vec3.cross × 10000', () => {
    const u = vec3(1, 0, 0);
    const w = vec3(0, 1, 0);
    for (let i = 0; i < 10000; i++) {
      cross(u, w);
    }
  });

  const q1 = new Float32Array([0, 0, 0, 1]);
  const q2 = new Float32Array([0.707, 0, 0, 0.707]);

  bench('Quat.slerp × 10000', () => {
    for (let i = 0; i < 10000; i++) {
      slerp(q1, q2, 0.5);
    }
  });
});

/* ── 场景遍历 ──────────────────────────────────────────────────── */

describe('Scene traversal', () => {
  // 构建 1000 节点的扁平场景
  const flatScene = new Scene();
  for (let i = 0; i < 1000; i++) {
    flatScene.addChild(new Node3D(`node-${i}`));
  }

  bench('traverse 1000 flat nodes', () => {
    let count = 0;
    flatScene.traverse(() => { count++; });
  });

  // 构建深度为 10 的二叉树场景（~1023 节点）
  const deepScene = new Scene();
  function buildTree(parent: Node3D, depth: number): void {
    if (depth <= 0) return;
    const left = new Node3D('L');
    const right = new Node3D('R');
    parent.addChild(left);
    parent.addChild(right);
    buildTree(left, depth - 1);
    buildTree(right, depth - 1);
  }
  buildTree(deepScene, 9);

  bench('traverse ~1023 deep tree nodes', () => {
    let count = 0;
    deepScene.traverse(() => { count++; });
  });
});

/* ── 视锥裁剪 ──────────────────────────────────────────────────── */

describe('Frustum culling throughput', () => {
  const vp = multiply(
    perspective(Math.PI / 4, 1.33, 0.1, 100),
    identity(),
  );
  const frustum = new Frustum();
  frustum.setFromProjectionMatrix(vp);

  // 预生成 1000 个随机 AABB
  const boxes: AABB[] = [];
  for (let i = 0; i < 1000; i++) {
    const x = (Math.random() - 0.5) * 200;
    const y = (Math.random() - 0.5) * 200;
    const z = -Math.random() * 200;
    boxes.push(new AABB(vec3(x, y, z), vec3(x + 1, y + 1, z + 1)));
  }

  bench('Frustum.intersectsAABB × 1000', () => {
    for (const box of boxes) {
      frustum.intersectsAABB(box);
    }
  });
});

/* ── AABB 计算 ──────────────────────────────────────────────────── */

describe('AABB computation', () => {
  // 1000 vertex geometry
  const positions = new Float32Array(3000);
  for (let i = 0; i < 3000; i++) {
    positions[i] = (Math.random() - 0.5) * 100;
  }
  const bigGeo = new Geometry({ positions });

  bench('AABB.fromGeometry 1000 vertices', () => {
    AABB.fromGeometry(bigGeo);
  });
});

/* ── 骨骼矩阵更新 ──────────────────────────────────────────────── */

describe('Skeleton update', () => {
  // 32-bone 链式骨骼
  const bones: BoneData[] = [];
  for (let i = 0; i < 32; i++) {
    bones.push({ name: `bone-${i}`, parentIndex: i - 1 });
  }
  const ibm = new Float32Array(32 * 16);
  for (let i = 0; i < 32; i++) {
    ibm[i * 16 + 0] = 1;
    ibm[i * 16 + 5] = 1;
    ibm[i * 16 + 10] = 1;
    ibm[i * 16 + 15] = 1;
  }
  const skeleton = new Skeleton(bones, ibm);

  bench('Skeleton.update 32 bones', () => {
    skeleton.update();
  });
});
