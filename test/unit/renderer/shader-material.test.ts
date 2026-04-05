/**
 * ShaderMaterial 单元测试 — 自定义着色器材质 + WebGLRenderer 集成。
 * Architect 预写测试，Dev 实现 src/renderer/shader-material.ts + WebGLRenderer 集成后全部通过。
 *
 * 测试覆盖：
 * 1. ShaderMaterial 类属性 & uniform 管理
 * 2. clone() 深拷贝
 * 3. WebGLRenderer 渲染 ShaderMaterial 的 Mesh（mock GL draw call）
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/renderer/shader-material';
import { Material } from '../../../src/renderer/material';
import { Texture } from '../../../src/renderer/texture';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

/* ───────────── Class structure ───────────── */

describeImpl('ShaderMaterial — class structure', () => {
  it('should extend Material', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() { gl_Position = vec4(0); }',
      fragmentShader: 'void main() { gl_FragColor = vec4(1); }',
    });
    expect(sm).toBeInstanceOf(Material);
  });

  it('should store vertex and fragment shader strings', () => {
    const vs = 'attribute vec3 a_position; void main() { gl_Position = vec4(a_position, 1.0); }';
    const fs = 'precision mediump float; void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }';
    const sm = new mod.ShaderMaterial({ vertexShader: vs, fragmentShader: fs });
    expect(sm.vertexShader).toBe(vs);
    expect(sm.fragmentShader).toBe(fs);
  });

  it('should default uniforms to empty object when not provided', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
    });
    expect(sm.uniforms).toBeDefined();
    expect(Object.keys(sm.uniforms).length).toBe(0);
  });
});

/* ───────────── Uniform declarations ───────────── */

describeImpl('ShaderMaterial — uniform declarations', () => {
  it('should accept float uniform', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      uniforms: {
        u_intensity: { type: 'float', value: 0.75 },
      },
    });
    expect(sm.uniforms.u_intensity.type).toBe('float');
    expect(sm.uniforms.u_intensity.value).toBe(0.75);
  });

  it('should accept vec3 uniform as number array', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      uniforms: {
        u_color: { type: 'vec3', value: [1, 0, 0] },
      },
    });
    expect(sm.uniforms.u_color.type).toBe('vec3');
    expect(sm.uniforms.u_color.value).toEqual([1, 0, 0]);
  });

  it('should accept mat4 uniform as Float32Array', () => {
    const identity = new Float32Array(16);
    identity[0] = identity[5] = identity[10] = identity[15] = 1;
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      uniforms: {
        u_transform: { type: 'mat4', value: identity },
      },
    });
    expect(sm.uniforms.u_transform.type).toBe('mat4');
    expect(sm.uniforms.u_transform.value).toBe(identity);
  });

  it('should accept sampler2D uniform as Texture', () => {
    const tex = Texture.defaultWhite();
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      uniforms: {
        u_diffuse: { type: 'sampler2D', value: tex },
      },
    });
    expect(sm.uniforms.u_diffuse.type).toBe('sampler2D');
    expect(sm.uniforms.u_diffuse.value).toBe(tex);
  });

  it('should accept int uniform', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      uniforms: {
        u_mode: { type: 'int', value: 2 },
      },
    });
    expect(sm.uniforms.u_mode.type).toBe('int');
    expect(sm.uniforms.u_mode.value).toBe(2);
  });

  it('should accept vec2 uniform', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      uniforms: {
        u_offset: { type: 'vec2', value: [0.5, -0.3] },
      },
    });
    expect(sm.uniforms.u_offset.type).toBe('vec2');
    expect(sm.uniforms.u_offset.value).toEqual([0.5, -0.3]);
  });

  it('should accept vec4 uniform', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      uniforms: {
        u_tint: { type: 'vec4', value: [1, 0.5, 0.2, 0.8] },
      },
    });
    expect(sm.uniforms.u_tint.type).toBe('vec4');
    expect(sm.uniforms.u_tint.value).toEqual([1, 0.5, 0.2, 0.8]);
  });
});

/* ───────────── setUniform ───────────── */

describeImpl('ShaderMaterial — setUniform', () => {
  it('should update value of an existing uniform', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      uniforms: {
        u_intensity: { type: 'float', value: 0.5 },
      },
    });
    sm.setUniform('u_intensity', 0.9);
    expect(sm.uniforms.u_intensity.value).toBe(0.9);
  });

  it('should throw when setting a non-declared uniform', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
    });
    expect(() => sm.setUniform('u_missing', 1.0)).toThrow();
  });
});

/* ───────────── clone ───────────── */

describeImpl('ShaderMaterial — clone', () => {
  it('should deep copy uniforms', () => {
    const sm = new mod.ShaderMaterial({
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      uniforms: {
        u_color: { type: 'vec3', value: [1, 0, 0] },
        u_alpha: { type: 'float', value: 0.5 },
      },
    });
    const cloned = sm.clone();

    // Same values
    expect(cloned.uniforms.u_color.value).toEqual([1, 0, 0]);
    expect(cloned.uniforms.u_alpha.value).toBe(0.5);
    expect(cloned.vertexShader).toBe(sm.vertexShader);
    expect(cloned.fragmentShader).toBe(sm.fragmentShader);

    // Independent copies — mutating clone does not affect original
    cloned.setUniform('u_alpha', 0.9);
    expect(sm.uniforms.u_alpha.value).toBe(0.5);
  });
});

/* ───────────── Renderer integration ───────────── */

describeImpl('ShaderMaterial — WebGLRenderer integration', () => {
  /**
   * ShaderMaterial の Mesh を WebGLRenderer.render() に渡すと draw call が発生する。
   * Mock GL で draw call 数を検証する。
   */
  it('should render a Mesh with ShaderMaterial via WebGLRenderer', async () => {
    // Dynamic imports to avoid pulling renderer into non-stub tests
    const { createMockCanvas } = await import('../../helpers/mock-gl');
    const { WebGLRenderer } = await import('../../../src/renderer/webgl-renderer');
    const { Scene } = await import('../../../src/core/scene');
    const { PerspectiveCamera } = await import('../../../src/core/camera');
    const { Mesh } = await import('../../../src/renderer/mesh');
    const { Geometry } = await import('../../../src/renderer/geometry');

    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const camera = new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });

    const geo = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    });
    const mat = new mod.ShaderMaterial({
      vertexShader: `
        attribute vec3 a_position;
        uniform mat4 u_mvp;
        void main() { gl_Position = u_mvp * vec4(a_position, 1.0); }
      `,
      fragmentShader: `
        precision mediump float;
        uniform vec3 u_color;
        void main() { gl_FragColor = vec4(u_color, 1.0); }
      `,
      uniforms: {
        u_color: { type: 'vec3', value: [0.2, 0.8, 0.4] },
      },
    });

    const mesh = new Mesh(geo, mat);
    scene.addChild(mesh);

    renderer.render(scene, camera);

    // Should produce at least one draw call
    expect(gl._drawCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should bind custom uniforms (getUniformLocation called for each)', async () => {
    const { createMockCanvas } = await import('../../helpers/mock-gl');
    const { WebGLRenderer } = await import('../../../src/renderer/webgl-renderer');
    const { Scene } = await import('../../../src/core/scene');
    const { PerspectiveCamera } = await import('../../../src/core/camera');
    const { Mesh } = await import('../../../src/renderer/mesh');
    const { Geometry } = await import('../../../src/renderer/geometry');

    const { canvas, gl } = createMockCanvas();
    const renderer = new WebGLRenderer(canvas);
    const scene = new Scene();
    const camera = new PerspectiveCamera({ fov: Math.PI / 3, aspect: 4 / 3, near: 0.1, far: 100 });

    const geo = new Geometry({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    });
    const mat = new mod.ShaderMaterial({
      vertexShader: `
        attribute vec3 a_position;
        uniform mat4 u_mvp;
        uniform float u_time;
        void main() { gl_Position = u_mvp * vec4(a_position, 1.0); }
      `,
      fragmentShader: `
        precision mediump float;
        uniform float u_intensity;
        void main() { gl_FragColor = vec4(u_intensity); }
      `,
      uniforms: {
        u_intensity: { type: 'float', value: 0.75 },
      },
    });

    scene.addChild(new Mesh(geo, mat));
    renderer.render(scene, camera);

    // getUniformLocation should have been called (for u_mvp + u_intensity at minimum)
    expect(gl._calls['getUniformLocation']).toBeGreaterThanOrEqual(2);
    // uniform1f should be called for the float uniform
    expect(gl._calls['uniform1f']).toBeGreaterThanOrEqual(1);
  });
});
