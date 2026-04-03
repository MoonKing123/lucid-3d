/**
 * Mock WebGL context factory — unit testing renderer without GPU.
 *
 * 提供完整的 WebGLRenderingContext mock：
 * - 所有 WebGL 1.0 常量
 * - _calls: 每个方法的调用计数
 * - _drawCalls: drawArrays/drawElements 记录
 * - _programs / _buffers / _textures: 创建计数（验证缓存）
 * - getShaderParameter(_, COMPILE_STATUS) → true
 * - getProgramParameter(_, LINK_STATUS) → true
 * - getAttribLocation → 递增整数（>= 0）
 * - getUniformLocation → 唯一非 null 对象
 */

/** 每个方法的调用计数 */
export interface CallTracker {
  [method: string]: number;
}

/** draw call 记录 */
export interface DrawCallRecord {
  type: 'drawArrays' | 'drawElements';
  count: number;
}

/** Mock GL 扩展属性 */
export interface MockGL {
  _calls: CallTracker;
  _drawCalls: DrawCallRecord[];
  _programs: number;
  _buffers: number;
  _textures: number;
}

/**
 * 创建完整的 mock WebGLRenderingContext，带调用追踪。
 */
export function createMockGL(): MockGL & WebGLRenderingContext {
  const calls: CallTracker = {};
  const drawCalls: DrawCallRecord[] = [];
  let programs = 0;
  let buffers = 0;
  let textures = 0;
  let attribCounter = 0;
  let uniformCounter = 0;

  function track(name: string): void {
    calls[name] = (calls[name] ?? 0) + 1;
  }

  // WebGL 1.0 常量
  const DEPTH_TEST          = 0x0B71;
  const BLEND               = 0x0BE2;
  const CULL_FACE           = 0x0B44;
  const VERTEX_SHADER       = 0x8B31;
  const FRAGMENT_SHADER     = 0x8B30;
  const COMPILE_STATUS      = 0x8B81;
  const LINK_STATUS         = 0x8B82;
  const ARRAY_BUFFER        = 0x8892;
  const ELEMENT_ARRAY_BUFFER = 0x8893;
  const STATIC_DRAW         = 0x88B4;
  const DYNAMIC_DRAW        = 0x88E8;
  const STREAM_DRAW         = 0x88E0;
  const FLOAT               = 0x1406;
  const UNSIGNED_SHORT      = 0x1403;
  const UNSIGNED_BYTE       = 0x1401;
  const BYTE                = 0x1400;
  const SHORT               = 0x1402;
  const INT                 = 0x1404;
  const UNSIGNED_INT        = 0x1405;
  const TRIANGLES           = 0x0004;
  const TRIANGLE_STRIP      = 0x0005;
  const TRIANGLE_FAN        = 0x0006;
  const LINES               = 0x0001;
  const LINE_STRIP          = 0x0003;
  const POINTS              = 0x0000;
  const COLOR_BUFFER_BIT    = 0x4000;
  const DEPTH_BUFFER_BIT    = 0x0100;
  const STENCIL_BUFFER_BIT  = 0x0400;
  const TEXTURE_2D          = 0x0DE1;
  const TEXTURE0            = 0x84C0;
  const RGBA                = 0x1908;
  const RGB                 = 0x1907;
  const LUMINANCE           = 0x1909;
  const ALPHA               = 0x1906;
  const TEXTURE_MIN_FILTER  = 0x2801;
  const TEXTURE_MAG_FILTER  = 0x2800;
  const TEXTURE_WRAP_S      = 0x2802;
  const TEXTURE_WRAP_T      = 0x2803;
  const NEAREST             = 0x2600;
  const LINEAR              = 0x2601;
  const CLAMP_TO_EDGE       = 0x812F;
  const REPEAT              = 0x2901;
  const SRC_ALPHA           = 0x0302;
  const ONE_MINUS_SRC_ALPHA = 0x0303;
  const ONE                 = 0x0001;
  const ZERO                = 0x0000;
  const SRC_COLOR           = 0x0300;
  const DST_COLOR           = 0x0306;
  const DST_ALPHA           = 0x0304;
  const ONE_MINUS_DST_ALPHA = 0x0305;
  const FUNC_ADD            = 0x8006;
  const LESS                = 0x0201;
  const LEQUAL              = 0x0203;
  const GREATER             = 0x0204;
  const GEQUAL              = 0x0206;
  const EQUAL               = 0x0202;
  const NOTEQUAL            = 0x0205;
  const ALWAYS              = 0x0207;
  const NEVER               = 0x0200;
  const FRONT               = 0x0404;
  const BACK                = 0x0405;
  const FRONT_AND_BACK      = 0x0408;
  const CCW                 = 0x0901;
  const CW                  = 0x0900;
  const FRAMEBUFFER         = 0x8D40;
  const RENDERBUFFER        = 0x8D41;
  const COLOR_ATTACHMENT0   = 0x8CE0;
  const DEPTH_ATTACHMENT    = 0x8D00;
  const STENCIL_ATTACHMENT  = 0x8D20;
  const DEPTH_STENCIL_ATTACHMENT = 0x821A;
  const FRAMEBUFFER_COMPLETE = 0x8CD5;
  const DEPTH_COMPONENT16   = 0x81A5;
  const DEPTH_STENCIL       = 0x84F9;
  const NO_ERROR            = 0;
  const UNPACK_FLIP_Y_WEBGL = 0x9240;
  const UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
  const TEXTURE_CUBE_MAP              = 0x8513;
  const TEXTURE_CUBE_MAP_POSITIVE_X   = 0x8515;
  const TEXTURE_CUBE_MAP_NEGATIVE_X   = 0x8516;
  const TEXTURE_CUBE_MAP_POSITIVE_Y   = 0x8517;
  const TEXTURE_CUBE_MAP_NEGATIVE_Y   = 0x8518;
  const TEXTURE_CUBE_MAP_POSITIVE_Z   = 0x8519;
  const TEXTURE_CUBE_MAP_NEGATIVE_Z   = 0x851A;

  const gl: any = {
    // ── 追踪属性 ─────────────────────────────────────────────────
    get _calls()     { return calls; },
    get _drawCalls() { return drawCalls; },
    get _programs()  { return programs; },
    get _buffers()   { return buffers; },
    get _textures()  { return textures; },

    // ── 常量 ─────────────────────────────────────────────────────
    DEPTH_TEST, BLEND, CULL_FACE,
    VERTEX_SHADER, FRAGMENT_SHADER,
    COMPILE_STATUS, LINK_STATUS,
    ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER,
    STATIC_DRAW, DYNAMIC_DRAW, STREAM_DRAW,
    FLOAT, UNSIGNED_SHORT, UNSIGNED_BYTE, BYTE, SHORT, INT, UNSIGNED_INT,
    TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN, LINES, LINE_STRIP, POINTS,
    COLOR_BUFFER_BIT, DEPTH_BUFFER_BIT, STENCIL_BUFFER_BIT,
    TEXTURE_2D, TEXTURE0,
    RGBA, RGB, LUMINANCE, ALPHA,
    TEXTURE_MIN_FILTER, TEXTURE_MAG_FILTER, TEXTURE_WRAP_S, TEXTURE_WRAP_T,
    NEAREST, LINEAR, CLAMP_TO_EDGE, REPEAT,
    SRC_ALPHA, ONE_MINUS_SRC_ALPHA, ONE, ZERO, SRC_COLOR, DST_COLOR,
    DST_ALPHA, ONE_MINUS_DST_ALPHA, FUNC_ADD,
    LESS, LEQUAL, GREATER, GEQUAL, EQUAL, NOTEQUAL, ALWAYS, NEVER,
    FRONT, BACK, FRONT_AND_BACK, CCW, CW,
    FRAMEBUFFER, RENDERBUFFER,
    COLOR_ATTACHMENT0, DEPTH_ATTACHMENT, STENCIL_ATTACHMENT, DEPTH_STENCIL_ATTACHMENT,
    FRAMEBUFFER_COMPLETE, DEPTH_COMPONENT16, DEPTH_STENCIL,
    NO_ERROR, UNPACK_FLIP_Y_WEBGL, UNPACK_PREMULTIPLY_ALPHA_WEBGL,
    TEXTURE_CUBE_MAP, TEXTURE_CUBE_MAP_POSITIVE_X, TEXTURE_CUBE_MAP_NEGATIVE_X,
    TEXTURE_CUBE_MAP_POSITIVE_Y, TEXTURE_CUBE_MAP_NEGATIVE_Y,
    TEXTURE_CUBE_MAP_POSITIVE_Z, TEXTURE_CUBE_MAP_NEGATIVE_Z,

    // canvas 由 createMockCanvas 注入
    canvas: null as unknown as HTMLCanvasElement,

    // ── 状态 ─────────────────────────────────────────────────────
    enable(cap: number):  void { track('enable'); },
    disable(cap: number): void { track('disable'); },
    viewport(x: number, y: number, w: number, h: number): void { track('viewport'); },
    clearColor(r: number, g: number, b: number, a: number): void { track('clearColor'); },
    clear(mask: number): void { track('clear'); },
    colorMask(r: boolean, g: boolean, b: boolean, a: boolean): void { track('colorMask'); },
    depthMask(flag: boolean): void { track('depthMask'); },
    depthFunc(func: number): void { track('depthFunc'); },
    depthRange(zNear: number, zFar: number): void { track('depthRange'); },
    stencilFunc(func: number, ref: number, mask: number): void { track('stencilFunc'); },
    stencilOp(fail: number, zfail: number, zpass: number): void { track('stencilOp'); },
    stencilMask(mask: number): void { track('stencilMask'); },
    cullFace(mode: number): void { track('cullFace'); },
    frontFace(mode: number): void { track('frontFace'); },
    lineWidth(width: number): void { track('lineWidth'); },
    polygonOffset(factor: number, units: number): void { track('polygonOffset'); },
    sampleCoverage(value: number, invert: boolean): void { track('sampleCoverage'); },
    scissor(x: number, y: number, w: number, h: number): void { track('scissor'); },
    blendFunc(src: number, dst: number): void { track('blendFunc'); },
    blendFuncSeparate(srcRGB: number, dstRGB: number, srcAlpha: number, dstAlpha: number): void { track('blendFuncSeparate'); },
    blendEquation(mode: number): void { track('blendEquation'); },
    blendEquationSeparate(modeRGB: number, modeAlpha: number): void { track('blendEquationSeparate'); },
    blendColor(r: number, g: number, b: number, a: number): void { track('blendColor'); },

    // ── Shader ────────────────────────────────────────────────────
    createShader(_type: number): WebGLShader {
      track('createShader');
      return {} as WebGLShader;
    },
    shaderSource(_shader: WebGLShader, _source: string): void { track('shaderSource'); },
    compileShader(_shader: WebGLShader): void { track('compileShader'); },
    getShaderParameter(_shader: WebGLShader, pname: number): unknown {
      track('getShaderParameter');
      if (pname === COMPILE_STATUS) return true;
      return null;
    },
    getShaderInfoLog(_shader: WebGLShader): string {
      track('getShaderInfoLog');
      return '';
    },
    deleteShader(_shader: WebGLShader | null): void { track('deleteShader'); },
    isShader(_shader: WebGLShader | null): boolean { return true; },

    // ── Program ───────────────────────────────────────────────────
    createProgram(): WebGLProgram {
      track('createProgram');
      programs++;
      return { _pid: programs } as unknown as WebGLProgram;
    },
    attachShader(_prog: WebGLProgram, _shader: WebGLShader): void { track('attachShader'); },
    detachShader(_prog: WebGLProgram, _shader: WebGLShader): void { track('detachShader'); },
    linkProgram(_prog: WebGLProgram): void { track('linkProgram'); },
    validateProgram(_prog: WebGLProgram): void { track('validateProgram'); },
    getProgramParameter(_prog: WebGLProgram, pname: number): unknown {
      track('getProgramParameter');
      if (pname === LINK_STATUS) return true;
      return null;
    },
    getProgramInfoLog(_prog: WebGLProgram): string {
      track('getProgramInfoLog');
      return '';
    },
    deleteProgram(_prog: WebGLProgram | null): void { track('deleteProgram'); },
    useProgram(_prog: WebGLProgram | null): void { track('useProgram'); },
    isProgram(_prog: WebGLProgram | null): boolean { return true; },

    // ── Attributes ────────────────────────────────────────────────
    getAttribLocation(_prog: WebGLProgram, _name: string): number {
      track('getAttribLocation');
      return attribCounter++;
    },
    enableVertexAttribArray(index: number): void { track('enableVertexAttribArray'); },
    disableVertexAttribArray(index: number): void { track('disableVertexAttribArray'); },
    vertexAttribPointer(
      index: number, size: number, type: number,
      normalized: boolean, stride: number, offset: number,
    ): void { track('vertexAttribPointer'); },
    vertexAttrib1f(index: number, x: number): void { track('vertexAttrib1f'); },
    vertexAttrib2f(index: number, x: number, y: number): void { track('vertexAttrib2f'); },
    vertexAttrib3f(index: number, x: number, y: number, z: number): void { track('vertexAttrib3f'); },
    vertexAttrib4f(index: number, x: number, y: number, z: number, w: number): void { track('vertexAttrib4f'); },

    // ── Uniforms ──────────────────────────────────────────────────
    getUniformLocation(_prog: WebGLProgram, _name: string): WebGLUniformLocation {
      track('getUniformLocation');
      return { _uid: ++uniformCounter } as unknown as WebGLUniformLocation;
    },
    getActiveUniform(_prog: WebGLProgram, _index: number): WebGLActiveInfo | null { return null; },
    getActiveAttrib(_prog: WebGLProgram, _index: number): WebGLActiveInfo | null { return null; },
    uniformMatrix4fv(_loc: WebGLUniformLocation | null, _t: boolean, _v: Float32List): void { track('uniformMatrix4fv'); },
    uniformMatrix3fv(_loc: WebGLUniformLocation | null, _t: boolean, _v: Float32List): void { track('uniformMatrix3fv'); },
    uniformMatrix2fv(_loc: WebGLUniformLocation | null, _t: boolean, _v: Float32List): void { track('uniformMatrix2fv'); },
    uniform1i(_loc: WebGLUniformLocation | null, _x: number): void { track('uniform1i'); },
    uniform1f(_loc: WebGLUniformLocation | null, _x: number): void { track('uniform1f'); },
    uniform2f(_loc: WebGLUniformLocation | null, _x: number, _y: number): void { track('uniform2f'); },
    uniform3f(_loc: WebGLUniformLocation | null, _x: number, _y: number, _z: number): void { track('uniform3f'); },
    uniform4f(_loc: WebGLUniformLocation | null, _x: number, _y: number, _z: number, _w: number): void { track('uniform4f'); },
    uniform1iv(_loc: WebGLUniformLocation | null, _v: Int32List): void { track('uniform1iv'); },
    uniform2iv(_loc: WebGLUniformLocation | null, _v: Int32List): void { track('uniform2iv'); },
    uniform3iv(_loc: WebGLUniformLocation | null, _v: Int32List): void { track('uniform3iv'); },
    uniform4iv(_loc: WebGLUniformLocation | null, _v: Int32List): void { track('uniform4iv'); },
    uniform1fv(_loc: WebGLUniformLocation | null, _v: Float32List): void { track('uniform1fv'); },
    uniform2fv(_loc: WebGLUniformLocation | null, _v: Float32List): void { track('uniform2fv'); },
    uniform3fv(_loc: WebGLUniformLocation | null, _v: Float32List): void { track('uniform3fv'); },
    uniform4fv(_loc: WebGLUniformLocation | null, _v: Float32List): void { track('uniform4fv'); },

    // ── Buffers ───────────────────────────────────────────────────
    createBuffer(): WebGLBuffer {
      track('createBuffer');
      buffers++;
      return { _bid: buffers } as unknown as WebGLBuffer;
    },
    bindBuffer(target: number, _buf: WebGLBuffer | null): void { track('bindBuffer'); },
    bufferData(target: number, _data: unknown, usage: number): void { track('bufferData'); },
    bufferSubData(target: number, offset: number, _data: unknown): void { track('bufferSubData'); },
    deleteBuffer(_buf: WebGLBuffer | null): void { track('deleteBuffer'); },
    isBuffer(_buf: WebGLBuffer | null): boolean { return true; },
    getBufferParameter(_target: number, _pname: number): unknown { return null; },

    // ── Textures ──────────────────────────────────────────────────
    createTexture(): WebGLTexture {
      track('createTexture');
      textures++;
      return { _tid: textures } as unknown as WebGLTexture;
    },
    bindTexture(_target: number, _tex: WebGLTexture | null): void { track('bindTexture'); },
    activeTexture(_texture: number): void { track('activeTexture'); },
    texImage2D(..._args: unknown[]): void { track('texImage2D'); },
    texSubImage2D(..._args: unknown[]): void { track('texSubImage2D'); },
    texParameteri(_target: number, _pname: number, _param: number): void { track('texParameteri'); },
    texParameterf(_target: number, _pname: number, _param: number): void { track('texParameterf'); },
    generateMipmap(_target: number): void { track('generateMipmap'); },
    deleteTexture(_tex: WebGLTexture | null): void { track('deleteTexture'); },
    isTexture(_tex: WebGLTexture | null): boolean { return true; },
    copyTexImage2D(..._args: unknown[]): void { track('copyTexImage2D'); },
    copyTexSubImage2D(..._args: unknown[]): void { track('copyTexSubImage2D'); },

    // ── Framebuffers ──────────────────────────────────────────────
    createFramebuffer(): WebGLFramebuffer {
      track('createFramebuffer');
      return {} as WebGLFramebuffer;
    },
    bindFramebuffer(_target: number, _fb: WebGLFramebuffer | null): void { track('bindFramebuffer'); },
    framebufferTexture2D(
      _target: number, _attachment: number,
      _textarget: number, _tex: WebGLTexture | null, _level: number,
    ): void { track('framebufferTexture2D'); },
    framebufferRenderbuffer(
      _target: number, _attachment: number,
      _rbtarget: number, _rb: WebGLRenderbuffer | null,
    ): void { track('framebufferRenderbuffer'); },
    checkFramebufferStatus(_target: number): number {
      return FRAMEBUFFER_COMPLETE;
    },
    deleteFramebuffer(_fb: WebGLFramebuffer | null): void { track('deleteFramebuffer'); },
    isFramebuffer(_fb: WebGLFramebuffer | null): boolean { return true; },
    getFramebufferAttachmentParameter(
      _target: number, _attachment: number, _pname: number,
    ): unknown { return null; },

    // ── Renderbuffers ─────────────────────────────────────────────
    createRenderbuffer(): WebGLRenderbuffer {
      track('createRenderbuffer');
      return {} as WebGLRenderbuffer;
    },
    bindRenderbuffer(_target: number, _rb: WebGLRenderbuffer | null): void { track('bindRenderbuffer'); },
    renderbufferStorage(
      _target: number, _internalformat: number, _width: number, _height: number,
    ): void { track('renderbufferStorage'); },
    deleteRenderbuffer(_rb: WebGLRenderbuffer | null): void { track('deleteRenderbuffer'); },
    isRenderbuffer(_rb: WebGLRenderbuffer | null): boolean { return true; },
    getRenderbufferParameter(_target: number, _pname: number): unknown { return null; },

    // ── Draw ──────────────────────────────────────────────────────
    drawArrays(_mode: number, _first: number, count: number): void {
      track('drawArrays');
      drawCalls.push({ type: 'drawArrays', count });
    },
    drawElements(_mode: number, count: number, _type: number, _offset: number): void {
      track('drawElements');
      drawCalls.push({ type: 'drawElements', count });
    },

    // ── Misc ──────────────────────────────────────────────────────
    getError(): number { return NO_ERROR; },
    flush(): void { track('flush'); },
    finish(): void { track('finish'); },
    pixelStorei(_pname: number, _param: number): void { track('pixelStorei'); },
    readPixels(
      _x: number, _y: number, _w: number, _h: number,
      _format: number, _type: number, _pixels: ArrayBufferView | null,
    ): void { track('readPixels'); },
    getParameter(_pname: number): unknown { return null; },
    getExtension(_name: string): unknown { return null; },
    getSupportedExtensions(): string[] { return []; },
    isEnabled(_cap: number): boolean { return false; },
    hint(_target: number, _mode: number): void { track('hint'); },
    lineWidth_: 1,
  };

  return gl as MockGL & WebGLRenderingContext;
}

/**
 * 创建 mock HTMLCanvasElement，其 getContext('webgl') 返回 mock GL。
 */
export function createMockCanvas(options?: {
  width?: number;
  height?: number;
}): { canvas: HTMLCanvasElement; gl: MockGL & WebGLRenderingContext } {
  const gl = createMockGL();

  const canvas = {
    width: options?.width ?? 800,
    height: options?.height ?? 600,
    getContext(contextType: string, _opts?: unknown): WebGLRenderingContext | null {
      if (contextType === 'webgl') return gl as unknown as WebGLRenderingContext;
      return null;
    },
  } as unknown as HTMLCanvasElement;

  // gl.canvas 指向 mock canvas
  (gl as any).canvas = canvas;

  return { canvas, gl };
}
