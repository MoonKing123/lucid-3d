import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/post-process';

const {
  PostProcessor,
  GrayscalePass,
  BlurPass,
  BloomPass,
} = mod;

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ── PostProcessor 管理 ── */

describeImpl('PostProcessor — pass 管理', () => {
  it('初始 passes 为空数组', () => {
    const pp = new PostProcessor();
    expect(pp.passes).toEqual([]);
  });

  it('addPass 添加到 passes 列表', () => {
    const pp = new PostProcessor();
    const pass = new GrayscalePass();
    pp.addPass(pass);
    expect(pp.passes).toHaveLength(1);
    expect(pp.passes[0]).toBe(pass);
  });

  it('addPass 可链式调用', () => {
    const pp = new PostProcessor();
    const result = pp.addPass(new GrayscalePass());
    expect(result).toBe(pp);
  });

  it('多次 addPass 保持插入顺序', () => {
    const pp = new PostProcessor();
    const g = new GrayscalePass();
    const b = new BlurPass();
    const bl = new BloomPass();
    pp.addPass(g).addPass(b).addPass(bl);
    expect(pp.passes.map((p) => p.name)).toEqual(['grayscale', 'blur', 'bloom']);
  });

  it('removePass 按名称移除', () => {
    const pp = new PostProcessor();
    pp.addPass(new GrayscalePass()).addPass(new BlurPass());
    pp.removePass('grayscale');
    expect(pp.passes).toHaveLength(1);
    expect(pp.passes[0].name).toBe('blur');
  });

  it('removePass 不存在的名称不报错', () => {
    const pp = new PostProcessor();
    pp.addPass(new GrayscalePass());
    expect(() => pp.removePass('nonexistent')).not.toThrow();
    expect(pp.passes).toHaveLength(1);
  });

  it('removePass 可链式调用', () => {
    const pp = new PostProcessor();
    pp.addPass(new GrayscalePass());
    const result = pp.removePass('grayscale');
    expect(result).toBe(pp);
  });
});

/* ── PostProcessor 尺寸 ── */

describeImpl('PostProcessor — 尺寸管理', () => {
  // 使用一个最小的 mock GL context
  const mockGL = {} as WebGLRenderingContext;

  it('initialize 设置内部尺寸', () => {
    const pp = new PostProcessor();
    pp.initialize(mockGL, 800, 600);
    expect(pp.width).toBe(800);
    expect(pp.height).toBe(600);
  });

  it('resize 更新内部尺寸', () => {
    const pp = new PostProcessor();
    pp.initialize(mockGL, 800, 600);
    pp.resize(mockGL, 1024, 768);
    expect(pp.width).toBe(1024);
    expect(pp.height).toBe(768);
  });
});

/* ── GrayscalePass ── */

describeImpl('GrayscalePass', () => {
  it('name = "grayscale"', () => {
    expect(new GrayscalePass().name).toBe('grayscale');
  });

  it('默认 enabled = true', () => {
    expect(new GrayscalePass().enabled).toBe(true);
  });

  it('片元着色器包含亮度计算', () => {
    const src = new GrayscalePass().getFragmentShader();
    expect(src.length).toBeGreaterThan(10);
    // 灰度通常用 dot(color, vec3(0.299, 0.587, 0.114)) 或类似
    expect(src).toMatch(/0\.299|luminance|gray/i);
  });
});

/* ── BlurPass ── */

describeImpl('BlurPass', () => {
  it('name = "blur"', () => {
    expect(new BlurPass().name).toBe('blur');
  });

  it('默认 radius = 2.0', () => {
    expect(new BlurPass().radius).toBeCloseTo(2.0);
  });

  it('自定义 radius', () => {
    expect(new BlurPass(5.0).radius).toBeCloseTo(5.0);
  });

  it('片元着色器包含纹理采样', () => {
    const src = new BlurPass().getFragmentShader();
    expect(src.length).toBeGreaterThan(10);
    expect(src).toContain('texture2D');
  });

  it('片元着色器使用多次采样（模糊核）', () => {
    const src = new BlurPass().getFragmentShader();
    // 高斯模糊至少采样 3 次（中心 + 两侧）
    const sampleCount = (src.match(/texture2D/g) || []).length;
    expect(sampleCount).toBeGreaterThanOrEqual(3);
  });
});

/* ── BloomPass ── */

describeImpl('BloomPass', () => {
  it('name = "bloom"', () => {
    expect(new BloomPass().name).toBe('bloom');
  });

  it('默认 threshold = 0.8', () => {
    expect(new BloomPass().threshold).toBeCloseTo(0.8);
  });

  it('默认 intensity = 1.0', () => {
    expect(new BloomPass().intensity).toBeCloseTo(1.0);
  });

  it('自定义 threshold 和 intensity', () => {
    const bloom = new BloomPass(0.5, 2.0);
    expect(bloom.threshold).toBeCloseTo(0.5);
    expect(bloom.intensity).toBeCloseTo(2.0);
  });

  it('片元着色器包含亮度阈值提取', () => {
    const src = new BloomPass().getFragmentShader();
    expect(src.length).toBeGreaterThan(10);
    // bloom 着色器应有亮度比较
    expect(src).toMatch(/threshold|step|smoothstep/i);
  });
});
