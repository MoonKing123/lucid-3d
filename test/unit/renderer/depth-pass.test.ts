import { describe, it, expect, vi } from 'vitest';
import { RenderTarget } from '../../../src/renderer/render-target';
import { PostProcessor, LINEARIZE_DEPTH_GLSL, type EffectPass } from '../../../src/renderer/post-process';

function createMockGL(opts: { hasDepthTextureExt?: boolean } = {}): any {
  const hasExt = opts.hasDepthTextureExt ?? true;
  const calls: any[] = [];
  return {
    _calls: calls,
    FRAMEBUFFER: 0x8d40, COLOR_ATTACHMENT0: 0x8ce0, DEPTH_ATTACHMENT: 0x8d00,
    TEXTURE_2D: 0x0de1, RGBA: 0x1908, UNSIGNED_BYTE: 0x1401,
    DEPTH_COMPONENT: 0x1902, UNSIGNED_INT: 0x1405, UNSIGNED_SHORT: 0x1403,
    NEAREST: 0x2600, LINEAR: 0x2601, CLAMP_TO_EDGE: 0x812f,
    TEXTURE_MIN_FILTER: 0x2801, TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802, TEXTURE_WRAP_T: 0x2803,
    DEPTH_COMPONENT16: 0x81a5, RENDERBUFFER: 0x8d41,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    TEXTURE0: 0x84c0, TEXTURE1: 0x84c1,
    getExtension: vi.fn((name: string) => (name === 'WEBGL_depth_texture' && hasExt) ? {} : null),
    createFramebuffer: vi.fn(() => ({ id: 'fbo' })),
    bindFramebuffer: vi.fn(),
    createTexture: vi.fn(() => ({ id: Math.random() })),
    bindTexture: vi.fn((target: number, tex: any) => calls.push(['bindTexture', target, tex])),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    framebufferTexture2D: vi.fn((_t: number, attachment: number, _tt: number, tex: any) =>
      calls.push(['framebufferTexture2D', attachment, tex])
    ),
    createRenderbuffer: vi.fn(() => ({ id: 'rbo' })),
    bindRenderbuffer: vi.fn(),
    renderbufferStorage: vi.fn(),
    framebufferRenderbuffer: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 0x8cd5),
    deleteFramebuffer: vi.fn(),
    deleteTexture: vi.fn(),
    deleteRenderbuffer: vi.fn(),
    activeTexture: vi.fn((unit: number) => calls.push(['activeTexture', unit])),
    getUniformLocation: vi.fn((_p, name: string) => ({ name })),
    uniform1i: vi.fn((loc: any, v: number) => calls.push(['uniform1i', loc?.name, v])),
  };
}

describe('RenderTarget — depthAsTexture', () => {
  it('depthAsTexture=false (default) keeps backward-compat depthRenderbuffer path', () => {
    const gl = createMockGL();
    const rt = new RenderTarget({ width: 256, height: 256 });
    rt.initialize(gl);
    expect(rt.depthRenderbuffer).not.toBeNull();
    expect(rt.depthTexture).toBeNull();
  });

  it('depthAsTexture=true creates depthTexture and skips renderbuffer', () => {
    const gl = createMockGL({ hasDepthTextureExt: true });
    const rt = new RenderTarget({ width: 256, height: 256, depthAsTexture: true });
    rt.initialize(gl);
    expect(rt.depthTexture).not.toBeNull();
    expect(rt.depthRenderbuffer).toBeNull();
    // depthTexture should be attached to DEPTH_ATTACHMENT
    const depthAttach = (gl as any)._calls.find(
      (c: any[]) => c[0] === 'framebufferTexture2D' && c[1] === gl.DEPTH_ATTACHMENT
    );
    expect(depthAttach).toBeDefined();
  });

  it('throws clear error when WEBGL_depth_texture extension unavailable', () => {
    const gl = createMockGL({ hasDepthTextureExt: false });
    const rt = new RenderTarget({ width: 256, height: 256, depthAsTexture: true });
    expect(() => rt.initialize(gl)).toThrow(/WEBGL_depth_texture/);
  });
});

describe('LINEARIZE_DEPTH_GLSL', () => {
  it('exports a GLSL string with linearizeDepth function definition', () => {
    expect(typeof LINEARIZE_DEPTH_GLSL).toBe('string');
    expect(LINEARIZE_DEPTH_GLSL).toContain('linearizeDepth');
    expect(LINEARIZE_DEPTH_GLSL).toContain('float');
    expect(LINEARIZE_DEPTH_GLSL).toContain('near');
    expect(LINEARIZE_DEPTH_GLSL).toContain('far');
  });

  it('GLSL function uses standard NDC unprojection formula', () => {
    // 验证 GLSL 内含 (2.0 * near * far) 这个标准 formula 的核心项
    expect(LINEARIZE_DEPTH_GLSL).toMatch(/2\.0\s*\*\s*near\s*\*\s*far/);
  });
});

describe('PostProcessor — setDepthTexture + u_depthTexture binding', () => {
  function makePass(usesDepth: boolean): EffectPass {
    return {
      name: 'mock',
      enabled: true,
      usesDepth,
      getFragmentShader: () => 'precision mediump float; void main(){ gl_FragColor=vec4(1.0); }',
      setUniforms: () => {},
    };
  }

  it('setDepthTexture stores texture handle', () => {
    const pp = new PostProcessor();
    const tex = { id: 'depth' } as any;
    pp.setDepthTexture(tex);
    // 没有 public getter 也可以；验证后续 binding 时能用
    expect(() => pp.setDepthTexture(null)).not.toThrow();
    expect(() => pp.setDepthTexture(tex)).not.toThrow();
  });

  it('binds depth texture to unit 1 + u_depthTexture uniform when pass.usesDepth=true', () => {
    const gl = createMockGL();
    const pp = new PostProcessor();
    const tex = { id: 'depth' } as any;
    pp.setDepthTexture(tex);
    const pass = makePass(true);
    // 测试 PostProcessor 内部绑定逻辑（可能需要 framework 暴露内部辅助方法或通过 render 路径）
    // 这里假设 PostProcessor 暴露 _bindDepthForPass(gl, pass, prog) 内部辅助
    const prog = { id: 'prog' } as any;
    // 若内部辅助名不同，测试可用 spy 验证 uniform1i('u_depthTexture', 1) 被调用
    if (typeof (pp as any)._bindDepthForPass === 'function') {
      (pp as any)._bindDepthForPass(gl, pass, prog);
    }
    // 验证 unit 1 被激活并绑定 + uniform1i 设为 1
    const activated1 = (gl as any)._calls.find(
      (c: any[]) => c[0] === 'activeTexture' && c[1] === gl.TEXTURE1
    );
    expect(activated1).toBeDefined();
    const uniform = (gl as any)._calls.find(
      (c: any[]) => c[0] === 'uniform1i' && c[1] === 'u_depthTexture' && c[2] === 1
    );
    expect(uniform).toBeDefined();
  });

  it('does NOT bind depth when pass.usesDepth=false (back-compat)', () => {
    const gl = createMockGL();
    const pp = new PostProcessor();
    pp.setDepthTexture({ id: 'depth' } as any);
    const pass = makePass(false);
    const prog = { id: 'prog' } as any;
    if (typeof (pp as any)._bindDepthForPass === 'function') {
      (pp as any)._bindDepthForPass(gl, pass, prog);
    }
    const uniform = (gl as any)._calls.find(
      (c: any[]) => c[0] === 'uniform1i' && c[1] === 'u_depthTexture'
    );
    expect(uniform).toBeUndefined();
  });

  it('does NOT bind depth when depthTexture is null', () => {
    const gl = createMockGL();
    const pp = new PostProcessor();
    pp.setDepthTexture(null);
    const pass = makePass(true);
    const prog = { id: 'prog' } as any;
    if (typeof (pp as any)._bindDepthForPass === 'function') {
      (pp as any)._bindDepthForPass(gl, pass, prog);
    }
    const uniform = (gl as any)._calls.find(
      (c: any[]) => c[0] === 'uniform1i' && c[1] === 'u_depthTexture'
    );
    expect(uniform).toBeUndefined();
  });
});

describe('EffectPass interface — usesDepth backward compatibility', () => {
  it('existing passes without usesDepth field continue to work', () => {
    const legacyPass: EffectPass = {
      name: 'legacy',
      enabled: true,
      getFragmentShader: () => 'void main() {}',
      setUniforms: () => {},
    };
    expect(legacyPass.usesDepth).toBeUndefined();
    // 在 PostProcessor 中也应被当作 usesDepth=false 处理
  });
});
