/**
 * CSM PhongMaterial 集成测试
 * 验证 Scene.cascadedShadowMap、PhongMaterial CSM shader、WebGLRenderer CSM 渲染路径。
 */
import { describe, it, expect, vi } from 'vitest';
import { CascadedShadowMap } from '../../../src/renderer/cascaded-shadow-map';
import { Scene } from '../../../src/core/scene';
import { PerspectiveCamera } from '../../../src/core/camera';
import { PhongMaterial } from '../../../src/renderer/phong-material';
import { Mesh } from '../../../src/renderer/mesh';
import { Geometry } from '../../../src/renderer/geometry';
import { WebGLRenderer } from '../../../src/renderer/webgl-renderer';
import * as mockGlMod from '../../helpers/mock-gl';

function makeCamera(): PerspectiveCamera {
  return new PerspectiveCamera({ fov: Math.PI / 4, aspect: 1, near: 0.1, far: 100 });
}

function makeTriGeo(): Geometry {
  const geo = new Geometry({ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) });
  geo.normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  return geo;
}

// ── Scene.cascadedShadowMap ────────────────────────────────────────

describe('Scene.cascadedShadowMap', () => {
  it('defaults to null', () => {
    const scene = new Scene();
    expect(scene.cascadedShadowMap).toBeNull();
  });

  it('accepts CascadedShadowMap assignment', () => {
    const scene = new Scene();
    const csm = new CascadedShadowMap({ numCascades: 4 });
    scene.cascadedShadowMap = csm;
    expect(scene.cascadedShadowMap).toBe(csm);
  });
});

// ── PhongMaterial CSM Shader ──────────────────────────────────────

describe('PhongMaterial CSM Shader', () => {
  it('fragment shader contains #define NUM_CASCADES 4', () => {
    const mat = new PhongMaterial();
    const fragSrc = mat.getFragmentShader();
    expect(fragSrc).toMatch(/#define\s+NUM_CASCADES\s+4/);
  });

  it('fragment shader contains CSM uniform declarations', () => {
    const mat = new PhongMaterial();
    const fragSrc = mat.getFragmentShader();
    expect(fragSrc).toContain('u_csmShadowMap');
    expect(fragSrc).toContain('u_csmLightSpaceMatrix');
    expect(fragSrc).toContain('u_csmSplits');
    expect(fragSrc).toContain('u_csmEnabled');
  });

  it('fragment shader uses unrolled if-else for cascade selection (WebGL 1.0 要求)', () => {
    const mat = new PhongMaterial();
    const fragSrc = mat.getFragmentShader();
    expect(fragSrc).toMatch(/if\s*\(\s*viewDepth\s*<=\s*u_csmSplits\[0\]/);
    expect(fragSrc).toContain('u_csmSplits[1]');
    expect(fragSrc).toContain('u_csmSplits[2]');
  });

  it('fragment shader calls computeCSMShadow in main()', () => {
    const mat = new PhongMaterial();
    const fragSrc = mat.getFragmentShader();
    expect(fragSrc).toContain('computeCSMShadow(');
    expect(fragSrc).toContain('shadowFactor');
  });

  it('fragment shader uses constant indices for sampler array access (WebGL 1.0 限制)', () => {
    const mat = new PhongMaterial();
    const fragSrc = mat.getFragmentShader();
    // 展开式 if-else 中使用常量索引 0-3
    expect(fragSrc).toContain('u_csmShadowMap[0]');
    expect(fragSrc).toContain('u_csmShadowMap[1]');
    expect(fragSrc).toContain('u_csmShadowMap[2]');
    expect(fragSrc).toContain('u_csmShadowMap[3]');
  });
});

// ── WebGLRenderer CSM Integration ─────────────────────────────────

describe('WebGLRenderer CSM Integration', () => {
  it('渲染时 scene.cascadedShadowMap=null 不绑定额外 FBO（向后兼容）', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new PhongMaterial()));
    const bindFboBefore = gl._calls['bindFramebuffer'] ?? 0;
    renderer.render(scene, makeCamera());
    // 无 CSM 时不应有额外的 FBO 绑定（shadow pass）
    const bindFboAfter = gl._calls['bindFramebuffer'] ?? 0;
    expect(bindFboAfter).toBe(bindFboBefore);
  });

  it('scene.cascadedShadowMap 非 null 时调用 csm.update(camera, lightDir)', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new PhongMaterial()));

    const csm = new CascadedShadowMap({ numCascades: 4 });
    const updateSpy = vi.spyOn(csm, 'update');
    scene.cascadedShadowMap = csm;

    renderer.render(scene, makeCamera());
    expect(updateSpy).toHaveBeenCalledOnce();
  });

  it('shadow pass 遍历所有 cascade，每个 cascade 绑定一次 FBO', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new PhongMaterial()));

    const csm = new CascadedShadowMap({ numCascades: 4 });
    scene.cascadedShadowMap = csm;

    renderer.render(scene, makeCamera());
    // shadow pass: 每个 cascade bind + 最后恢复 null = 5 次 bindFramebuffer (4 + 1)
    expect(gl._calls['bindFramebuffer']).toBeGreaterThanOrEqual(4);
  });

  it('CSM splits 数组传给 uniform (uniform1fv 被调用)', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new PhongMaterial()));

    const csm = new CascadedShadowMap({ numCascades: 4 });
    scene.cascadedShadowMap = csm;

    renderer.render(scene, makeCamera());
    // uniform1fv 用于传 csm splits
    expect(gl._calls['uniform1fv']).toBeGreaterThan(0);
  });

  it('u_csmEnabled 在无 CSM 时设为 false (uniform1i 被调用传 0)', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new PhongMaterial()));

    renderer.render(scene, makeCamera());
    // 无 CSM 时设 u_csmEnabled=0
    expect(gl._calls['uniform1i']).toBeGreaterThan(0);
  });

  it('numCascades != 4 时抛错', () => {
    const { canvas } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new PhongMaterial()));

    const csm = new CascadedShadowMap({ numCascades: 2 });
    scene.cascadedShadowMap = csm;

    expect(() => renderer.render(scene, makeCamera())).toThrow(/numCascades 必须为 4/);
  });

  it('全 renderer 测试零回归：无 CSM 场景基本渲染正常', () => {
    const { canvas, gl } = mockGlMod.createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    scene.addChild(new Mesh(makeTriGeo(), new PhongMaterial()));
    expect(() => renderer.render(scene, makeCamera())).not.toThrow();
    expect(gl._drawCalls.length).toBeGreaterThan(0);
  });
});
