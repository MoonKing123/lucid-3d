/**
 * Mock WebGL context factory for unit testing the renderer.
 *
 * Provides a comprehensive mock of WebGLRenderingContext that tracks all calls
 * and returns minimal valid values. Allows tests to verify renderer behavior
 * without a real GPU.
 *
 * Dev should implement:
 * 1. Call-tracking proxy that counts method invocations
 * 2. Draw call recording (type + vertex/index count)
 * 3. Program/buffer/texture creation counting
 * 4. Return value control for getShaderParameter, getProgramParameter etc.
 *
 * @module
 */
export const __STUB__ = true;

/** Tracked calls record: method name → invocation count */
export interface CallTracker {
  [method: string]: number;
}

/** Recorded draw call: which draw method + how many vertices/indices */
export interface DrawCallRecord {
  type: 'drawArrays' | 'drawElements';
  count: number;
}

/** Mock GL context with call tracking */
export interface MockGL {
  /** Per-method invocation counts */
  _calls: CallTracker;
  /** Ordered list of draw calls made */
  _drawCalls: DrawCallRecord[];
  /** Number of programs created (for caching verification) */
  _programs: number;
  /** Number of buffers created (for caching verification) */
  _buffers: number;
  /** Number of textures created */
  _textures: number;
}

/**
 * Create a mock WebGLRenderingContext with full call tracking.
 *
 * Requirements:
 * - All WebGL constants (DEPTH_TEST, TRIANGLES, FLOAT, etc.)
 * - All methods return minimal valid values (createShader → {}, etc.)
 * - _calls tracks invocation count per method name
 * - _drawCalls records each drawArrays/drawElements with vertex count
 * - _programs increments on createProgram
 * - _buffers increments on createBuffer
 * - _textures increments on createTexture
 * - getShaderParameter(_, COMPILE_STATUS) → true
 * - getProgramParameter(_, LINK_STATUS) → true
 * - getAttribLocation → sequential integers (0, 1, 2, ...)
 * - getUniformLocation → unique objects
 */
export function createMockGL(): MockGL & WebGLRenderingContext {
  throw new Error('Stub: implement createMockGL in test/helpers/mock-gl.ts');
}

/**
 * Create a mock HTMLCanvasElement whose getContext('webgl') returns a mock GL.
 *
 * @returns { canvas, gl } — canvas for WebGLRenderer constructor, gl for assertions
 */
export function createMockCanvas(options?: {
  width?: number;
  height?: number;
}): { canvas: HTMLCanvasElement; gl: MockGL & WebGLRenderingContext } {
  throw new Error('Stub: implement createMockCanvas in test/helpers/mock-gl.ts');
}
