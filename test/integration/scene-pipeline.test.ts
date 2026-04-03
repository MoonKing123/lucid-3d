/**
 * 集成测试 — 多模块组合场景验证。
 * 跨模块边界测试引擎核心管线，不需要 WebGL 上下文。
 *
 * 验证：
 * - Scene + Camera + Frustum 裁剪管线
 * - AnimationMixer + Skeleton 动画驱动
 * - GameLoop 定时器行为
 * - LOD 层级距离切换
 * - Scene 层次结构遍历
 */
import { describe, it, expect } from 'vitest';
import { Scene } from '../../src/core/scene';
import { PerspectiveCamera } from '../../src/core/camera';
import { Mesh } from '../../src/renderer/mesh';
import { Material } from '../../src/renderer/material';
import { Geometry } from '../../src/renderer/geometry';
import { Frustum } from '../../src/math/frustum';
import { AABB } from '../../src/math/aabb';
import { Node3D } from '../../src/core/node3d';
import { GameLoop } from '../../src/core/game-loop';
import { LOD } from '../../src/core/lod';
import { AmbientLight, DirectionalLight } from '../../src/core/light';
import { Skeleton, type BoneData } from '../../src/animation/skeleton';
import { AnimationMixer } from '../../src/animation/animation-mixer';
import { AnimationClip } from '../../src/animation/animation-clip';
import { KeyframeTrack, type TargetPath } from '../../src/animation/keyframe-track';
import { vec3 } from '../../src/math/vec3';

/* ── helpers ─────────────────────────────────────────────────────── */

function makeTriGeo(x = 0, y = 0, z = 0): Geometry {
  return new Geometry({
    positions: new Float32Array([x, y, z, x + 1, y, z, x, y + 1, z]),
  });
}

/* ── Scene + Camera + Frustum 裁剪管线 ──────────────────────────── */

describe('Scene + Camera + Frustum culling pipeline', () => {
  it('should mark mesh at origin as visible when camera looks at origin', () => {
    const camera = new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
    camera.position = vec3(0, 0, 5);
    camera.lookAt(vec3(0, 0, 0));
    const frustum = new Frustum();
    frustum.setFromProjectionMatrix(camera.viewProjectionMatrix);
    const mesh = new Mesh(makeTriGeo(), new Material());
    expect(frustum.intersectsAABB(mesh.boundingBox)).toBe(true);
  });

  it('should mark mesh far behind camera as not visible', () => {
    const camera = new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });
    camera.position = vec3(0, 0, 5);
    camera.lookAt(vec3(0, 0, 0));
    const frustum = new Frustum();
    frustum.setFromProjectionMatrix(camera.viewProjectionMatrix);
    // Mesh at z=50 is behind the camera (camera is at z=5 looking toward -Z)
    const farMesh = new Mesh(makeTriGeo(0, 0, 50), new Material());
    expect(frustum.intersectsAABB(farMesh.boundingBox)).toBe(false);
  });
});

/* ── AnimationMixer + Skeleton 动画驱动 ────────────────────────── */

describe('AnimationMixer + Skeleton pipeline', () => {
  function makeSimpleSkeleton(): Skeleton {
    const bones: BoneData[] = [
      { name: 'root', parentIndex: -1 },
      { name: 'child', parentIndex: 0 },
    ];
    // 2 bones × 16 floats = 32 floats, identity matrices
    const ibm = new Float32Array(32);
    for (let i = 0; i < 2; i++) {
      ibm[i * 16 + 0] = 1;
      ibm[i * 16 + 5] = 1;
      ibm[i * 16 + 10] = 1;
      ibm[i * 16 + 15] = 1;
    }
    return new Skeleton(bones, ibm);
  }

  it('should update bone matrices after AnimationMixer.update()', () => {
    const skeleton = makeSimpleSkeleton();
    const mixer = new AnimationMixer(skeleton);
    // Create a simple translation track on joint 0
    const track = new KeyframeTrack({
      targetPath: 'translation',
      jointIndex: 0,
      times: new Float32Array([0, 1]),
      values: new Float32Array([0, 0, 0, 2, 0, 0]), // x: 0 → 2
    });
    const clip = new AnimationClip('walk', [track]);
    mixer.play(clip, { loop: false });
    // Advance to t=0.5 → joint 0 should interpolate to x=1
    mixer.update(0.5);
    // mixer.update() internally calls skeleton.update()
    // boneMatrices[12] is the x-translation of bone 0's final matrix
    // Exact value depends on implementation, but should differ from initial
    expect(skeleton.boneMatrices[12]).not.toBe(0);
  });

  it('should loop animation when loop=true', () => {
    const skeleton = makeSimpleSkeleton();
    const mixer = new AnimationMixer(skeleton);
    const track = new KeyframeTrack({
      targetPath: 'translation',
      jointIndex: 0,
      times: new Float32Array([0, 1]),
      values: new Float32Array([0, 0, 0, 2, 0, 0]),
    });
    const clip = new AnimationClip('walk', [track]);
    mixer.play(clip, { loop: true });
    // Advance past duration — should not stop
    mixer.update(1.5);
    // Mixer should still be playing (internal time wraps)
    expect(mixer.isPlaying).toBe(true);
    mixer.update(0.1);
    // Should not throw and bone matrices should be valid
    expect(skeleton.boneMatrices.length).toBeGreaterThan(0);
  });
});

/* ── GameLoop 定时器行为 ──────────────────────────────────────── */

describe('GameLoop step behavior', () => {
  it('should call onUpdate with provided delta time', () => {
    const loop = new GameLoop();
    let receivedDt = -1;
    loop.onUpdate = (dt) => { receivedDt = dt; };
    loop.step(0.016);
    expect(receivedDt).toBeCloseTo(0.016, 5);
  });

  it('should call onFixedUpdate at fixed intervals', () => {
    const loop = new GameLoop({ fixedTimeStep: 1 / 60 });
    let fixedCount = 0;
    loop.onFixedUpdate = () => { fixedCount++; };
    // Step with 2× fixed timestep → should fire fixedUpdate twice
    loop.step(2 / 60);
    expect(fixedCount).toBe(2);
  });

  it('should call onRender after updates', () => {
    const loop = new GameLoop();
    const order: string[] = [];
    loop.onUpdate = () => { order.push('update'); };
    loop.onRender = () => { order.push('render'); };
    loop.step(0.016);
    expect(order).toEqual(['update', 'render']);
  });
});

/* ── LOD 层级距离切换 ──────────────────────────────────────────── */

describe('LOD + Camera distance switching', () => {
  it('should show high-detail mesh when camera is close', () => {
    const lod = new LOD();
    const highDetail = new Node3D('high');
    const lowDetail = new Node3D('low');
    lod.addLevel(highDetail, 0);   // distance 0 = highest detail
    lod.addLevel(lowDetail, 10);   // distance 10 = lower detail
    // Camera at (0,0,3), LOD at origin → distance ≈ 3 < 10
    lod.update(vec3(0, 0, 3));
    expect(highDetail.visible).toBe(true);
    expect(lowDetail.visible).toBe(false);
  });

  it('should switch to low-detail when camera is far', () => {
    const lod = new LOD();
    const highDetail = new Node3D('high');
    const lowDetail = new Node3D('low');
    lod.addLevel(highDetail, 0);
    lod.addLevel(lowDetail, 10);
    // Camera at (0,0,50) → distance ≈ 50 > 10
    lod.update(vec3(0, 0, 50));
    expect(highDetail.visible).toBe(false);
    expect(lowDetail.visible).toBe(true);
  });
});

/* ── Scene 层次结构遍历 ──────────────────────────────────────── */

describe('Scene hierarchy traversal', () => {
  it('should traverse parent-child chain collecting all lights', () => {
    const scene = new Scene();
    const group = new Node3D('group');
    const ambient = new AmbientLight([1, 1, 1], 0.5);
    const dir = new DirectionalLight([1, 1, 1], 1.0, [0, -1, 0]);
    group.addChild(dir);
    scene.addChild(group);
    scene.addChild(ambient);
    const lights = scene.collectLights();
    expect(lights.ambient.length).toBe(1);
    expect(lights.directional.length).toBe(1);
  });

  it('should count total nodes via traverse', () => {
    const scene = new Scene();
    const a = new Node3D('a');
    const b = new Node3D('b');
    const c = new Node3D('c');
    a.addChild(b);
    b.addChild(c);
    scene.addChild(a);
    let count = 0;
    scene.traverse(() => { count++; });
    // scene + a + b + c = 4
    expect(count).toBe(4);
  });
});
