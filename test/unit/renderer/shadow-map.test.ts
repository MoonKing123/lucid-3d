import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/shadow-map';

const {
  ShadowMap,
  SHADOW_VERTEX_PARS,
  SHADOW_VERTEX_CODE,
  SHADOW_FRAGMENT_PARS,
  SHADOW_FRAGMENT_CODE,
} = mod;

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ── 辅助 ── */
const vec3 = (x: number, y: number, z: number) => new Float32Array([x, y, z]);

describeImpl('ShadowMap — 构造与默认值', () => {
  it('默认 resolution = 1024', () => {
    const sm = new ShadowMap();
    expect(sm.resolution).toBe(1024);
  });

  it('默认 bias = 0.005', () => {
    const sm = new ShadowMap();
    expect(sm.bias).toBeCloseTo(0.005);
  });

  it('默认 near = 0.1, far = 100', () => {
    const sm = new ShadowMap();
    expect(sm.near).toBeCloseTo(0.1);
    expect(sm.far).toBe(100);
  });

  it('自定义选项覆盖默认值', () => {
    const sm = new ShadowMap({ resolution: 2048, bias: 0.01, near: 1, far: 200 });
    expect(sm.resolution).toBe(2048);
    expect(sm.bias).toBeCloseTo(0.01);
    expect(sm.near).toBe(1);
    expect(sm.far).toBe(200);
  });

  it('内部创建与 resolution 匹配的 RenderTarget', () => {
    const sm = new ShadowMap({ resolution: 512 });
    expect(sm.renderTarget).toBeDefined();
    expect(sm.renderTarget.width).toBe(512);
    expect(sm.renderTarget.height).toBe(512);
  });

  it('RenderTarget 启用深度缓冲', () => {
    const sm = new ShadowMap();
    expect(sm.renderTarget.depthBuffer).toBe(true);
  });
});

describeImpl('ShadowMap — configure()', () => {
  it('configure 后 lightViewMatrix 非 null', () => {
    const sm = new ShadowMap();
    sm.configure(vec3(0, -1, 0), vec3(0, 0, 0), 10);
    expect(sm.lightViewMatrix).not.toBeNull();
    expect(sm.lightViewMatrix).toBeInstanceOf(Float32Array);
    expect(sm.lightViewMatrix!.length).toBe(16);
  });

  it('configure 后 lightProjMatrix 非 null（正交投影）', () => {
    const sm = new ShadowMap();
    sm.configure(vec3(0, -1, 0), vec3(0, 0, 0), 10);
    expect(sm.lightProjMatrix).not.toBeNull();
    expect(sm.lightProjMatrix).toBeInstanceOf(Float32Array);
    expect(sm.lightProjMatrix!.length).toBe(16);
  });

  it('configure 后 lightVPMatrix 非 null（view * proj 乘积）', () => {
    const sm = new ShadowMap();
    sm.configure(vec3(0, -1, 0), vec3(0, 0, 0), 10);
    expect(sm.lightVPMatrix).not.toBeNull();
    expect(sm.lightVPMatrix!.length).toBe(16);
  });

  it('lightProjMatrix 是正交投影（m[15] = 1）', () => {
    const sm = new ShadowMap();
    sm.configure(vec3(0, -1, 0), vec3(0, 0, 0), 10);
    // 正交投影矩阵的 m[15] = 1（透视投影为 0）
    expect(sm.lightProjMatrix![15]).toBeCloseTo(1, 3);
  });

  it('sceneRadius 改变影响投影范围', () => {
    const sm1 = new ShadowMap();
    sm1.configure(vec3(0, -1, 0), vec3(0, 0, 0), 5);
    const sm2 = new ShadowMap();
    sm2.configure(vec3(0, -1, 0), vec3(0, 0, 0), 20);
    // 不同 radius 应产生不同的投影矩阵
    expect(sm1.lightProjMatrix![0]).not.toBeCloseTo(sm2.lightProjMatrix![0], 3);
  });

  it('不同光线方向产生不同的 view 矩阵', () => {
    const sm1 = new ShadowMap();
    sm1.configure(vec3(0, -1, 0), vec3(0, 0, 0), 10);
    const sm2 = new ShadowMap();
    sm2.configure(vec3(-1, -1, 0), vec3(0, 0, 0), 10);
    // 至少有一个元素不同
    let differ = false;
    for (let i = 0; i < 16; i++) {
      if (Math.abs(sm1.lightViewMatrix![i] - sm2.lightViewMatrix![i]) > 1e-6) {
        differ = true;
        break;
      }
    }
    expect(differ).toBe(true);
  });
});

describeImpl('ShadowMap — 深度渲染着色器', () => {
  it('getDepthVertexShader() 返回非空 GLSL', () => {
    const sm = new ShadowMap();
    const src = sm.getDepthVertexShader();
    expect(src.length).toBeGreaterThan(10);
    expect(src).toContain('gl_Position');
  });

  it('getDepthFragmentShader() 返回非空 GLSL', () => {
    const sm = new ShadowMap();
    const src = sm.getDepthFragmentShader();
    expect(src.length).toBeGreaterThan(10);
    expect(src).toContain('gl_FragColor');
  });

  it('深度片元着色器写入深度值到颜色通道', () => {
    const sm = new ShadowMap();
    const src = sm.getDepthFragmentShader();
    // 深度编码通常使用 gl_FragCoord.z 或自定义 varying
    expect(src).toMatch(/gl_FragCoord|v_depth|depth/i);
  });
});

describeImpl('ShadowMap — 主 pass GLSL 注入片段', () => {
  it('SHADOW_VERTEX_PARS 声明 v_shadowCoord varying', () => {
    expect(SHADOW_VERTEX_PARS).toContain('v_shadowCoord');
  });

  it('SHADOW_VERTEX_CODE 计算 v_shadowCoord', () => {
    expect(SHADOW_VERTEX_CODE).toContain('v_shadowCoord');
    expect(SHADOW_VERTEX_CODE).toContain('u_lightVP');
  });

  it('SHADOW_FRAGMENT_PARS 声明 u_shadowMap sampler', () => {
    expect(SHADOW_FRAGMENT_PARS).toContain('u_shadowMap');
    expect(SHADOW_FRAGMENT_PARS).toContain('sampler2D');
  });

  it('SHADOW_FRAGMENT_CODE 包含阴影因子计算', () => {
    expect(SHADOW_FRAGMENT_CODE).toContain('shadow');
    // 应引用 bias
    expect(SHADOW_FRAGMENT_CODE).toContain('bias');
  });
});
