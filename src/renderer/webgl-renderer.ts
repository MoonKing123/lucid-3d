/**
 * WebGLRenderer — traverses the scene graph and renders all Mesh nodes.
 * Uses WebGL 1.0 for maximum compatibility (WeChat mini-games).
 */

import { type Mat4, multiply, normalMatrix as computeNormalMatrix, transformPoint } from '../math/mat4';
import { type Vec3, vec3 } from '../math/vec3';
import { Frustum } from '../math/frustum';
import { buildRenderQueue, type QueueItem } from './render-queue';
import { Node3D } from '../core/node3d';
import { Scene } from '../core/scene';
import { Camera } from '../core/camera';
import { AmbientLight, DirectionalLight } from '../core/light';
import { PointLight } from '../core/point-light';
import { SpotLight } from '../core/spot-light';
import { Mesh } from './mesh';
import { SkinnedMesh } from './skinned-mesh';
import { Geometry } from './geometry';
import { Material, Side, BlendMode } from './material';
import { ShaderMaterial } from './shader-material';
import { TextureMaterial } from './texture-material';
import { Texture, TextureWrap, TextureFilter } from './texture';
import { PhongMaterial } from './phong-material';
import { BitmapTextMaterial } from './bitmap-text';
import { Line, LineMaterial } from './line-renderer';
import { Sprite, SpriteMaterial } from './sprite';
import { type RenderInfo, createRenderInfo, resetRenderInfo } from './render-info';
import { CubeTexture } from './cube-texture';
import { SkyboxRenderer } from './skybox';
import { ParticleEmitter } from './particle-emitter';
import { ParticleRenderer } from './particle-renderer';
import { type FogOptions } from '../core/scene';
import { FOG_VERTEX_PARS, FOG_VERTEX_CODE, FOG_FRAGMENT_PARS, FOG_FRAGMENT_CODE } from './fog';

// ── Fog shader injection ──────────────────────────────────────────

/** 将雾效 GLSL 注入顶点着色器 */
function injectFogVertex(src: string): string {
  const modelMatrixDecl = src.includes('u_modelMatrix') ? '' : 'uniform mat4 u_modelMatrix;\n';
  const pars = `${FOG_VERTEX_PARS}\n${modelMatrixDecl}`;
  const withPars = src.replace('void main()', `${pars}\nvoid main()`);
  const lastBrace = withPars.lastIndexOf('}');
  return withPars.substring(0, lastBrace) + `  ${FOG_VERTEX_CODE}\n` + withPars.substring(lastBrace);
}

/** 将雾效 GLSL 注入片元着色器 */
function injectFogFragment(src: string): string {
  const withPars = src.replace('void main()', `${FOG_FRAGMENT_PARS}\nvoid main()`);
  const lastBrace = withPars.lastIndexOf('}');
  return withPars.substring(0, lastBrace) + `  ${FOG_FRAGMENT_CODE}\n` + withPars.substring(lastBrace);
}

// ── Internal GPU resource cache ──────────────────────────────────

interface PhongLocations {
  aNormal: number;
  uModelMatrix: WebGLUniformLocation | null;
  uNormalMatrix: WebGLUniformLocation | null;
  uAmbientColor: WebGLUniformLocation | null;
  uCameraPos: WebGLUniformLocation | null;
  uDiffuse: WebGLUniformLocation | null;
  uSpecular: WebGLUniformLocation | null;
  uShininess: WebGLUniformLocation | null;
  uMap: WebGLUniformLocation | null;
  uHasMap: WebGLUniformLocation | null;
  // 自发光
  uEmissive: WebGLUniformLocation | null;
  uEmissiveMap: WebGLUniformLocation | null;
  uHasEmissiveMap: WebGLUniformLocation | null;
  // 法线贴图
  aTangent: number;
  uNormalMap: WebGLUniformLocation | null;
  uHasNormalMap: WebGLUniformLocation | null;
  uNormalScale: WebGLUniformLocation | null;
  // 高光贴图
  uSpecularMap: WebGLUniformLocation | null;
  uHasSpecularMap: WebGLUniformLocation | null;
  // 多方向光
  uNumDirLights: WebGLUniformLocation | null;
  uDirLightDirs: Array<WebGLUniformLocation | null>;
  uDirLightColors: Array<WebGLUniformLocation | null>;
  // 点光源
  uNumPointLights: WebGLUniformLocation | null;
  uPointLightPositions: Array<WebGLUniformLocation | null>;
  uPointLightColors: Array<WebGLUniformLocation | null>;
  uPointLightDistances: Array<WebGLUniformLocation | null>;
  uPointLightDecays: Array<WebGLUniformLocation | null>;
  // 聚光灯
  uNumSpotLights: WebGLUniformLocation | null;
  uSpotLightPositions: Array<WebGLUniformLocation | null>;
  uSpotLightDirs: Array<WebGLUniformLocation | null>;
  uSpotLightColors: Array<WebGLUniformLocation | null>;
  uSpotLightDistances: Array<WebGLUniformLocation | null>;
  uSpotLightDecays: Array<WebGLUniformLocation | null>;
  uSpotLightCosAngles: Array<WebGLUniformLocation | null>;
  uSpotLightPenumbras: Array<WebGLUniformLocation | null>;
}

interface FogLocations {
  uFogColor: WebGLUniformLocation | null;
  uFogNear: WebGLUniformLocation | null;
  uFogFar: WebGLUniformLocation | null;
  uModelMatrix: WebGLUniformLocation | null;
}

interface CompiledProgram {
  program: WebGLProgram;
  aPosition: number;
  aColor: number;
  aUv: number;
  uMvp: WebGLUniformLocation;
  phong?: PhongLocations;
  fogLoc?: FogLocations;
}

interface UploadedGeometry {
  positionBuffer: WebGLBuffer;
  colorBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer | null;
  normalBuffer: WebGLBuffer | null;
  tangentBuffer: WebGLBuffer | null;
  indexBuffer: WebGLBuffer | null;
  indexCount: number;
  vertexCount: number;
  jointsBuffer: WebGLBuffer | null;
  weightsBuffer: WebGLBuffer | null;
}

// ── Line program cache ───────────────────────────────────────────

interface LineProgramInfo {
  program: WebGLProgram;
  aPosition: number;
  aColor: number;
  uMvp: WebGLUniformLocation;
  uColor: WebGLUniformLocation | null;
  uOpacity: WebGLUniformLocation | null;
}

// ── Sprite program cache ─────────────────────────────────────────

interface SpriteProgramInfo {
  program: WebGLProgram;
  aPosition: number;
  aUv: number;
  uModelView: WebGLUniformLocation | null;
  uProjection: WebGLUniformLocation | null;
  uColor: WebGLUniformLocation | null;
  uOpacity: WebGLUniformLocation | null;
  uHasTexture: WebGLUniformLocation | null;
  uTexture: WebGLUniformLocation | null;
}

interface SpriteQuad {
  positionBuffer: WebGLBuffer;
  uvBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
}

// WebGL 1.0 LINE_LOOP 常量（mock 中可能未定义）
const GL_LINE_LOOP = 0x0002;

const MAX_BONES = 32;

// 蒙皮顶点着色器
const SKIN_VERT_SRC = `
precision mediump float;
attribute vec3 a_position;
attribute vec3 a_color;
attribute vec4 a_joints;
attribute vec4 a_weights;
uniform mat4 u_mvp;
uniform mat4 u_boneMatrices[${MAX_BONES}];
varying vec3 v_color;
void main() {
  mat4 skinMatrix =
    a_weights.x * u_boneMatrices[int(a_joints.x)] +
    a_weights.y * u_boneMatrices[int(a_joints.y)] +
    a_weights.z * u_boneMatrices[int(a_joints.z)] +
    a_weights.w * u_boneMatrices[int(a_joints.w)];
  gl_Position = u_mvp * skinMatrix * vec4(a_position, 1.0);
  v_color = a_color;
}
`.trim();

const SKIN_FRAG_SRC = `
precision mediump float;
varying vec3 v_color;
void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
`.trim();

interface SkinningProgram {
  program: WebGLProgram;
  aPosition: number;
  aColor: number;
  aJoints: number;
  aWeights: number;
  uMvp: WebGLUniformLocation;
  uBoneMatrices: WebGLUniformLocation;
}

const MAX_DIR_LIGHTS = 4;
const MAX_POINT_LIGHTS = 4;
const MAX_SPOT_LIGHTS = 4;

interface DirLightData {
  dir: Vec3;
  color: Vec3;
}

interface PointLightData {
  position: Vec3;
  color: Vec3;
  distance: number;
  decay: number;
}

interface SpotLightData {
  position: Vec3;
  direction: Vec3;
  color: Vec3;
  distance: number;
  decay: number;
  cosAngle: number;  // cos(外锥角)
  cosInner: number;  // cos(angle * (1 - penumbra))，用于 smoothstep
}

interface LightContext {
  ambientColor: Vec3;
  cameraPos: Vec3;
  dirLights: DirLightData[];
  pointLights: PointLightData[];
  spotLights: SpotLightData[];
}

// ── Shader helpers ────────────────────────────────────────────────

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  return program;
}

/** 从列优先 Mat4 提取左上 3×3 子矩阵（列优先 mat3，供 uniformMatrix3fv 使用）*/
function extractMat3(m: Mat4): Float32Array {
  return new Float32Array([
    m[0], m[1], m[2],
    m[4], m[5], m[6],
    m[8], m[9], m[10],
  ]);
}

// ── 视锥剔除 / 渲染队列辅助 ──────────────────────────────────────

interface MeshRenderItem extends QueueItem {
  mesh: Mesh;
}

/**
 * 视锥体与世界 AABB 相交测试（跳过近裁面，由 GPU 硬件处理）。
 * 近裁面剔除会错误地剔除贴近相机的物体，其他 5 个面已足够。
 */
function intersectsAABBExcludeNear(
  frustum: Frustum,
  aabb: { min: Vec3; max: Vec3 },
): boolean {
  for (let i = 0; i < frustum.planes.length; i++) {
    if (i === 4) continue; // 跳过近裁面（planes[4]）
    const plane = frustum.planes[i];
    const px = plane.normal[0] >= 0 ? aabb.max[0] : aabb.min[0];
    const py = plane.normal[1] >= 0 ? aabb.max[1] : aabb.min[1];
    const pz = plane.normal[2] >= 0 ? aabb.max[2] : aabb.min[2];
    const d = plane.normal[0] * px + plane.normal[1] * py + plane.normal[2] * pz + plane.constant;
    if (d < 0) return false;
  }
  return true;
}

/** 将 Mesh 的 boundingBox 变换到世界空间，返回世界 AABB */
function computeWorldAABB(mesh: Mesh): { min: Vec3; max: Vec3 } {
  const bb = mesh.boundingBox;
  const wm = mesh.worldMatrix;
  const corners: Vec3[] = [
    transformPoint(wm, vec3(bb.min[0], bb.min[1], bb.min[2])),
    transformPoint(wm, vec3(bb.max[0], bb.min[1], bb.min[2])),
    transformPoint(wm, vec3(bb.min[0], bb.max[1], bb.min[2])),
    transformPoint(wm, vec3(bb.max[0], bb.max[1], bb.min[2])),
    transformPoint(wm, vec3(bb.min[0], bb.min[1], bb.max[2])),
    transformPoint(wm, vec3(bb.max[0], bb.min[1], bb.max[2])),
    transformPoint(wm, vec3(bb.min[0], bb.max[1], bb.max[2])),
    transformPoint(wm, vec3(bb.max[0], bb.max[1], bb.max[2])),
  ];
  const min = vec3(Infinity, Infinity, Infinity);
  const max = vec3(-Infinity, -Infinity, -Infinity);
  for (const c of corners) {
    if (c[0] < min[0]) min[0] = c[0];
    if (c[1] < min[1]) min[1] = c[1];
    if (c[2] < min[2]) min[2] = c[2];
    if (c[0] > max[0]) max[0] = c[0];
    if (c[1] > max[1]) max[1] = c[1];
    if (c[2] > max[2]) max[2] = c[2];
  }
  return { min, max };
}

/** 计算 Mesh 的世界空间中心（用于深度排序） */
function computeWorldCenter(mesh: Mesh): Vec3 {
  return transformPoint(mesh.worldMatrix, mesh.boundingBox.center());
}

// ── WebGLRenderer ─────────────────────────────────────────────────

export class WebGLRenderer {
  private gl: WebGLRenderingContext;

  // Caches keyed by object identity
  private programCache: WeakMap<Material, CompiledProgram> = new WeakMap();
  // 雾效变体缓存（同一材质的雾效版本单独缓存）
  private fogProgramCache: WeakMap<Material, CompiledProgram> = new WeakMap();
  private geometryCache: WeakMap<Geometry, UploadedGeometry> = new WeakMap();
  private textureCache: WeakMap<Texture, { glTex: WebGLTexture; version: number }> = new WeakMap();
  readonly info: RenderInfo = createRenderInfo();
  private skinningProgram: SkinningProgram | null = null;
  private lineProgramCache: WeakMap<LineMaterial, LineProgramInfo> = new WeakMap();
  private spriteProgramCache: WeakMap<SpriteMaterial, SpriteProgramInfo> = new WeakMap();
  private spriteQuad: SpriteQuad | null = null;
  private skyboxRenderer: SkyboxRenderer | null = null;
  private particleCache: WeakMap<ParticleEmitter, ParticleRenderer> = new WeakMap();

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    gl.enable(gl.DEPTH_TEST);
  }

  /**
   * Render one frame. Traverses the scene graph and draws all Mesh nodes.
   * @param scene  - root node of the scene (may be any Node3D)
   * @param camera - perspective camera providing view-projection matrix
   */
  render(scene: Scene, camera: Camera): void {
    const gl = this.gl;
    const _startTime = performance.now();
    resetRenderInfo(this.info);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const bg = scene.background;
    if (bg instanceof CubeTexture) {
      gl.clearColor(0, 0, 0, 1.0);
    } else {
      gl.clearColor(bg[0], bg[1], bg[2], 1.0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 天空盒渲染（clear 后、场景遍历前）
    if (bg instanceof CubeTexture) {
      if (this.skyboxRenderer === null) {
        this.skyboxRenderer = new SkyboxRenderer(gl);
      }
      this.skyboxRenderer.render(bg, camera);
    }

    // 收集光源
    let ambientColor: Vec3 = vec3(0, 0, 0);
    const dirLights: DirLightData[] = [];
    const pointLights: PointLightData[] = [];
    const spotLights: SpotLightData[] = [];

    const collected = scene.collectLights();
    for (const node of collected.ambient) {
      ambientColor = vec3(
        node.color[0] * node.intensity,
        node.color[1] * node.intensity,
        node.color[2] * node.intensity,
      );
    }
    for (const node of collected.directional) {
      if (dirLights.length >= MAX_DIR_LIGHTS) break;
      dirLights.push({
        dir: node.direction,
        color: vec3(
          node.color[0] * node.intensity,
          node.color[1] * node.intensity,
          node.color[2] * node.intensity,
        ),
      });
    }
    for (const node of collected.point) {
      if (pointLights.length >= MAX_POINT_LIGHTS) break;
      const wm = node.worldMatrix;
      // 列优先矩阵：第四列（索引 12,13,14）为世界坐标
      const worldPos = vec3(wm[12], wm[13], wm[14]);
      pointLights.push({
        position: worldPos,
        color: vec3(
          node.color[0] * node.intensity,
          node.color[1] * node.intensity,
          node.color[2] * node.intensity,
        ),
        distance: node.distance,
        decay: node.decay,
      });
    }

    for (const node of collected.spot) {
      if (spotLights.length >= MAX_SPOT_LIGHTS) break;
      spotLights.push({
        position:  node.worldPosition,
        direction: node.worldDirection,
        color: vec3(
          node.color[0] * node.intensity,
          node.color[1] * node.intensity,
          node.color[2] * node.intensity,
        ),
        distance: node.distance,
        decay:    node.decay,
        cosAngle: Math.cos(node.angle),
        cosInner: Math.cos(node.angle * (1 - node.penumbra)),
      });
    }

    const lightCtx: LightContext = {
      ambientColor,
      cameraPos: camera.position,
      dirLights,
      pointLights,
      spotLights,
    };

    const viewProj = camera.viewProjectionMatrix;

    // 建立视锥体用于剔除
    const frustum = new Frustum();
    frustum.setFromProjectionMatrix(viewProj);

    const lines: Line[] = [];
    const sprites: Sprite[] = [];
    const emitters: ParticleEmitter[] = [];
    const meshItems: MeshRenderItem[] = [];

    scene.traverse((node) => {
      if (node instanceof Mesh) {
        // 视锥剔除：frustumCulled=true 时检测，false 时始终渲染
        if (node.frustumCulled) {
          const worldAABB = computeWorldAABB(node);
          if (!intersectsAABBExcludeNear(frustum, worldAABB)) return;
        }
        // 计算到相机的平方距离（用于深度排序）
        const center = computeWorldCenter(node);
        const cp = camera.position;
        const dx = center[0] - cp[0];
        const dy = center[1] - cp[1];
        const dz = center[2] - cp[2];
        const distanceSq = dx * dx + dy * dy + dz * dz;
        const mat = node.material;
        const transparent = mat.transparent || mat.opacity < 1.0;
        meshItems.push({ mesh: node, transparent, distanceSq });
      } else if (node instanceof Line) {
        lines.push(node);
      } else if (node instanceof Sprite) {
        sprites.push(node);
      } else if (node instanceof ParticleEmitter) {
        emitters.push(node);
      }
    });

    // 渲染队列排序：不透明前到后，透明后到前
    const queue = buildRenderQueue(meshItems);

    // 先绘制不透明网格
    for (const item of queue.opaque) {
      this._drawMesh(item.mesh, viewProj, lightCtx, scene.fog);
    }
    // 再绘制透明网格
    for (const item of queue.transparent) {
      this._drawMesh(item.mesh, viewProj, lightCtx, scene.fog);
    }

    // Line 和 Sprite 在所有 Mesh 之后渲染（叠加行为）
    for (const line of lines) {
      this._drawLine(line, viewProj);
    }
    for (const sprite of sprites) {
      this._drawSprite(sprite, camera);
    }

    // 粒子最后渲染（在所有不透明、透明、线条、精灵之后）
    for (const emitter of emitters) {
      if (!emitter.visible || emitter.activeCount === 0) continue;
      let particleRenderer = this.particleCache.get(emitter);
      if (!particleRenderer) {
        particleRenderer = new ParticleRenderer(gl, emitter.options.maxParticles);
        this.particleCache.set(emitter, particleRenderer);
      }
      particleRenderer.update(emitter);
      particleRenderer.render(viewProj);
    }

    this.info.frameTime = performance.now() - _startTime;
  }

  /** Release all GPU resources. */
  dispose(): void {
    // WeakMaps will be GC'd along with the Geometry/Material objects.
    // Nothing else to clean up explicitly without iterating all cached entries.
  }

  private _applyTextureSamplingParams(texture: Texture): void {
    const gl = this.gl;

    // wrapS
    const wrapSMap: Record<TextureWrap, number> = {
      [TextureWrap.ClampToEdge]:    gl.CLAMP_TO_EDGE,
      [TextureWrap.Repeat]:         gl.REPEAT,
      [TextureWrap.MirroredRepeat]: (gl as any).MIRRORED_REPEAT ?? 0x8370,
    };
    // wrapT
    const wrapTMap: Record<TextureWrap, number> = {
      [TextureWrap.ClampToEdge]:    gl.CLAMP_TO_EDGE,
      [TextureWrap.Repeat]:         gl.REPEAT,
      [TextureWrap.MirroredRepeat]: (gl as any).MIRRORED_REPEAT ?? 0x8370,
    };
    // minFilter
    const minFilterMap: Record<TextureFilter, number> = {
      [TextureFilter.Nearest]:              gl.NEAREST,
      [TextureFilter.Linear]:               gl.LINEAR,
      [TextureFilter.NearestMipmapNearest]: (gl as any).NEAREST_MIPMAP_NEAREST ?? 0x2700,
      [TextureFilter.NearestMipmapLinear]:  (gl as any).NEAREST_MIPMAP_LINEAR  ?? 0x2702,
      [TextureFilter.LinearMipmapNearest]:  (gl as any).LINEAR_MIPMAP_NEAREST  ?? 0x2701,
      [TextureFilter.LinearMipmapLinear]:   (gl as any).LINEAR_MIPMAP_LINEAR   ?? 0x2703,
    };
    // magFilter（只支持 NEAREST / LINEAR）
    const magFilterMap: Record<TextureFilter, number> = {
      [TextureFilter.Nearest]:              gl.NEAREST,
      [TextureFilter.Linear]:               gl.LINEAR,
      [TextureFilter.NearestMipmapNearest]: gl.NEAREST,
      [TextureFilter.NearestMipmapLinear]:  gl.LINEAR,
      [TextureFilter.LinearMipmapNearest]:  gl.NEAREST,
      [TextureFilter.LinearMipmapLinear]:   gl.LINEAR,
    };

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapSMap[texture.wrapS]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapTMap[texture.wrapT]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilterMap[texture.minFilter]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilterMap[texture.magFilter]);
  }

  private _uploadTextureData(texture: Texture): void {
    const gl = this.gl;
    if (texture.flipY) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    }
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      texture.width, texture.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, texture.data,
    );
    if (texture.generateMipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    if (texture.flipY) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    }
  }

  private _getWebGLTexture(texture: Texture): WebGLTexture {
    const gl = this.gl;
    const cached = this.textureCache.get(texture);

    if (cached) {
      if (cached.version !== texture.version) {
        // 版本变更，重新上传数据并更新采样参数
        gl.bindTexture(gl.TEXTURE_2D, cached.glTex);
        this._uploadTextureData(texture);
        this._applyTextureSamplingParams(texture);
        cached.version = texture.version;
      }
      return cached.glTex;
    }

    const webglTex = gl.createTexture();
    if (!webglTex) throw new Error('Failed to create WebGL texture');

    gl.bindTexture(gl.TEXTURE_2D, webglTex);
    this._uploadTextureData(texture);
    this._applyTextureSamplingParams(texture);

    this.textureCache.set(texture, { glTex: webglTex, version: texture.version });
    return webglTex;
  }

  // ── Private helpers ─────────────────────────────────────────────

  private _getProgram(material: Material, hasFog = false): CompiledProgram {
    const cache = hasFog ? this.fogProgramCache : this.programCache;
    const cached = cache.get(material);
    if (cached) return cached;

    const gl = this.gl;
    const vsSource = hasFog ? injectFogVertex(material.vertexShader) : material.vertexShader;
    const fsSource = hasFog ? injectFogFragment(material.fragmentShader) : material.fragmentShader;
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = createProgram(gl, vs, fs);

    // Clean up individual shaders after linking
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const aPosition = gl.getAttribLocation(program, 'a_position');
    const aColor    = gl.getAttribLocation(program, 'a_color');
    const aUv       = gl.getAttribLocation(program, 'a_uv');
    const uMvpLoc   = gl.getUniformLocation(program, 'u_mvp');
    if (!uMvpLoc) throw new Error('Shader must define uniform mat4 u_mvp');

    const compiled: CompiledProgram = { program, aPosition, aColor, aUv, uMvp: uMvpLoc };

    // 如果是 PhongMaterial，查询额外的 attribute / uniform 位置
    if (material instanceof PhongMaterial) {
      const dirDirs: Array<WebGLUniformLocation | null> = [];
      const dirColors: Array<WebGLUniformLocation | null> = [];
      const ptPositions: Array<WebGLUniformLocation | null> = [];
      const ptColors: Array<WebGLUniformLocation | null> = [];
      const ptDistances: Array<WebGLUniformLocation | null> = [];
      const ptDecays: Array<WebGLUniformLocation | null> = [];
      for (let i = 0; i < MAX_DIR_LIGHTS; i++) {
        dirDirs.push(gl.getUniformLocation(program, `u_dirLightDirs[${i}]`));
        dirColors.push(gl.getUniformLocation(program, `u_dirLightColors[${i}]`));
      }
      for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
        ptPositions.push(gl.getUniformLocation(program, `u_pointLightPositions[${i}]`));
        ptColors.push(gl.getUniformLocation(program, `u_pointLightColors[${i}]`));
        ptDistances.push(gl.getUniformLocation(program, `u_pointLightDistances[${i}]`));
        ptDecays.push(gl.getUniformLocation(program, `u_pointLightDecays[${i}]`));
      }
      const spPositions: Array<WebGLUniformLocation | null> = [];
      const spDirs:      Array<WebGLUniformLocation | null> = [];
      const spColors:    Array<WebGLUniformLocation | null> = [];
      const spDistances: Array<WebGLUniformLocation | null> = [];
      const spDecays:    Array<WebGLUniformLocation | null> = [];
      const spCosAngles: Array<WebGLUniformLocation | null> = [];
      const spPenumbras: Array<WebGLUniformLocation | null> = [];
      for (let i = 0; i < MAX_SPOT_LIGHTS; i++) {
        spPositions.push(gl.getUniformLocation(program, `u_spotLightPositions[${i}]`));
        spDirs.push(gl.getUniformLocation(program, `u_spotLightDirs[${i}]`));
        spColors.push(gl.getUniformLocation(program, `u_spotLightColors[${i}]`));
        spDistances.push(gl.getUniformLocation(program, `u_spotLightDistances[${i}]`));
        spDecays.push(gl.getUniformLocation(program, `u_spotLightDecays[${i}]`));
        spCosAngles.push(gl.getUniformLocation(program, `u_spotLightCosAngles[${i}]`));
        spPenumbras.push(gl.getUniformLocation(program, `u_spotLightPenumbras[${i}]`));
      }
      compiled.phong = {
        aNormal:            gl.getAttribLocation(program, 'a_normal'),
        uModelMatrix:       gl.getUniformLocation(program, 'u_modelMatrix'),
        uNormalMatrix:      gl.getUniformLocation(program, 'u_normalMatrix'),
        uAmbientColor:      gl.getUniformLocation(program, 'u_ambientColor'),
        uCameraPos:         gl.getUniformLocation(program, 'u_cameraPos'),
        uDiffuse:           gl.getUniformLocation(program, 'u_diffuse'),
        uSpecular:          gl.getUniformLocation(program, 'u_specular'),
        uShininess:         gl.getUniformLocation(program, 'u_shininess'),
        uMap:               gl.getUniformLocation(program, 'u_map'),
        uHasMap:            gl.getUniformLocation(program, 'u_hasMap'),
        uEmissive:          gl.getUniformLocation(program, 'u_emissive'),
        uEmissiveMap:       gl.getUniformLocation(program, 'u_emissiveMap'),
        uHasEmissiveMap:    gl.getUniformLocation(program, 'u_hasEmissiveMap'),
        aTangent:           gl.getAttribLocation(program, 'a_tangent'),
        uNormalMap:         gl.getUniformLocation(program, 'u_normalMap'),
        uHasNormalMap:      gl.getUniformLocation(program, 'u_hasNormalMap'),
        uNormalScale:       gl.getUniformLocation(program, 'u_normalScale'),
        uSpecularMap:       gl.getUniformLocation(program, 'u_specularMap'),
        uHasSpecularMap:    gl.getUniformLocation(program, 'u_hasSpecularMap'),
        uNumDirLights:      gl.getUniformLocation(program, 'u_numDirLights'),
        uDirLightDirs:      dirDirs,
        uDirLightColors:    dirColors,
        uNumPointLights:    gl.getUniformLocation(program, 'u_numPointLights'),
        uPointLightPositions: ptPositions,
        uPointLightColors:  ptColors,
        uPointLightDistances: ptDistances,
        uPointLightDecays:  ptDecays,
        uNumSpotLights:     gl.getUniformLocation(program, 'u_numSpotLights'),
        uSpotLightPositions: spPositions,
        uSpotLightDirs:     spDirs,
        uSpotLightColors:   spColors,
        uSpotLightDistances: spDistances,
        uSpotLightDecays:   spDecays,
        uSpotLightCosAngles: spCosAngles,
        uSpotLightPenumbras: spPenumbras,
      };
    }

    if (hasFog) {
      compiled.fogLoc = {
        uFogColor:    gl.getUniformLocation(program, 'u_fogColor'),
        uFogNear:     gl.getUniformLocation(program, 'u_fogNear'),
        uFogFar:      gl.getUniformLocation(program, 'u_fogFar'),
        uModelMatrix: gl.getUniformLocation(program, 'u_modelMatrix'),
      };
    }

    cache.set(material, compiled);
    return compiled;
  }

  private _getGeometry(geometry: Geometry): UploadedGeometry {
    const cached = this.geometryCache.get(geometry);
    if (cached) return cached;

    const gl = this.gl;

    // Position buffer
    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) throw new Error('Failed to create position buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

    // Color buffer
    const colorBuffer = gl.createBuffer();
    if (!colorBuffer) throw new Error('Failed to create color buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry.colors, gl.STATIC_DRAW);

    // UV buffer (optional)
    let uvBuffer: WebGLBuffer | null = null;
    if (geometry.uvs) {
      uvBuffer = gl.createBuffer();
      if (!uvBuffer) throw new Error('Failed to create UV buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW);
    }

    // Normal buffer（可选）
    let normalBuffer: WebGLBuffer | null = null;
    if (geometry.normals) {
      normalBuffer = gl.createBuffer();
      if (!normalBuffer) throw new Error('Failed to create normal buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);
    }

    // Tangent buffer（可选，用于法线贴图 TBN 矩阵）
    let tangentBuffer: WebGLBuffer | null = null;
    if (geometry.tangents) {
      tangentBuffer = gl.createBuffer();
      if (!tangentBuffer) throw new Error('Failed to create tangent buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.tangents, gl.STATIC_DRAW);
    }

    // Index buffer (optional)
    let indexBuffer: WebGLBuffer | null = null;
    let indexCount = 0;
    if (geometry.indices) {
      indexBuffer = gl.createBuffer();
      if (!indexBuffer) throw new Error('Failed to create index buffer');
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
      indexCount = geometry.indices.length;
    }

    // Joints buffer (optional, for SkinnedMesh)
    let jointsBuffer: WebGLBuffer | null = null;
    if (geometry.joints) {
      jointsBuffer = gl.createBuffer();
      if (!jointsBuffer) throw new Error('Failed to create joints buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, jointsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.joints, gl.STATIC_DRAW);
    }

    // Weights buffer (optional, for SkinnedMesh)
    let weightsBuffer: WebGLBuffer | null = null;
    if (geometry.weights) {
      weightsBuffer = gl.createBuffer();
      if (!weightsBuffer) throw new Error('Failed to create weights buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, weightsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.weights, gl.STATIC_DRAW);
    }

    const vertexCount = geometry.positions.length / 3;
    const uploaded: UploadedGeometry = {
      positionBuffer,
      colorBuffer,
      uvBuffer,
      normalBuffer,
      tangentBuffer,
      indexBuffer,
      indexCount,
      vertexCount,
      jointsBuffer,
      weightsBuffer,
    };
    this.geometryCache.set(geometry, uploaded);
    return uploaded;
  }

  private _getSkinningProgram(): SkinningProgram {
    if (this.skinningProgram) return this.skinningProgram;
    const gl = this.gl;
    const vs = compileShader(gl, gl.VERTEX_SHADER, SKIN_VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, SKIN_FRAG_SRC);
    const program = createProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const uMvpLoc = gl.getUniformLocation(program, 'u_mvp');
    const uBoneLoc = gl.getUniformLocation(program, 'u_boneMatrices[0]');
    if (!uMvpLoc) throw new Error('Skinning shader must define uniform mat4 u_mvp');
    if (!uBoneLoc) throw new Error('Skinning shader must define uniform mat4 u_boneMatrices');

    this.skinningProgram = {
      program,
      aPosition: gl.getAttribLocation(program, 'a_position'),
      aColor:    gl.getAttribLocation(program, 'a_color'),
      aJoints:   gl.getAttribLocation(program, 'a_joints'),
      aWeights:  gl.getAttribLocation(program, 'a_weights'),
      uMvp:      uMvpLoc,
      uBoneMatrices: uBoneLoc,
    };
    return this.skinningProgram;
  }

  private _drawMesh(mesh: Mesh, viewProj: Mat4, lightCtx: LightContext, fog: FogOptions | null = null): void {
    // SkinnedMesh 走专用蒙皮路径
    if (mesh instanceof SkinnedMesh) {
      this._drawSkinnedMesh(mesh, viewProj);
      return;
    }

    // visible=false 跳过渲染
    if (!mesh.material.visible) return;

    const gl = this.gl;
    const mat = mesh.material;

    // 配置 face culling
    switch (mat.side) {
      case Side.Front:
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        break;
      case Side.Back:
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        break;
      case Side.Double:
        gl.disable(gl.CULL_FACE);
        break;
    }

    // 配置深度写入
    gl.depthMask(mat.depthWrite);

    // 配置深度测试
    if (mat.depthTest) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }

    // 配置混合模式
    switch (mat.effectiveBlendMode()) {
      case BlendMode.None:
        gl.disable(gl.BLEND);
        break;
      case BlendMode.Normal:
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        break;
      case BlendMode.Additive:
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        break;
      case BlendMode.Multiply:
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.DST_COLOR, gl.ZERO);
        break;
    }

    // BitmapTextMaterial 和 ShaderMaterial 不注入雾效（ShaderMaterial 自行处理）
    const applyFog = fog !== null && !(mesh.material instanceof BitmapTextMaterial) && !(mesh.material instanceof ShaderMaterial);
    const compiled  = this._getProgram(mesh.material, applyFog);
    const uploaded  = this._getGeometry(mesh.geometry);

    // MVP = viewProjection * worldMatrix
    const mvp = multiply(viewProj, mesh.worldMatrix);

    gl.useProgram(compiled.program);

    // Upload MVP uniform
    gl.uniformMatrix4fv(compiled.uMvp, false, mvp);

    // Bind position attribute
    if (compiled.aPosition >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.positionBuffer);
      gl.enableVertexAttribArray(compiled.aPosition);
      gl.vertexAttribPointer(compiled.aPosition, 3, gl.FLOAT, false, 0, 0);
    }

    // Bind color attribute
    if (compiled.aColor >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.colorBuffer);
      gl.enableVertexAttribArray(compiled.aColor);
      gl.vertexAttribPointer(compiled.aColor, 3, gl.FLOAT, false, 0, 0);
    }

    // Bind UV attribute 和纹理（仅 TextureMaterial）
    if (mesh.material instanceof TextureMaterial) {
      if (compiled.aUv >= 0 && uploaded.uvBuffer !== null) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.uvBuffer);
        gl.enableVertexAttribArray(compiled.aUv);
        gl.vertexAttribPointer(compiled.aUv, 2, gl.FLOAT, false, 0, 0);
      }
      const webglTex = this._getWebGLTexture(mesh.material.texture);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, webglTex);
      const uTexture = gl.getUniformLocation(compiled.program, 'u_texture');
      gl.uniform1i(uTexture, 0);
    }

    // BitmapTextMaterial 专用：绑定字体 atlas 纹理 + u_color + 开启 alpha blend
    if (mesh.material instanceof BitmapTextMaterial) {
      if (compiled.aUv >= 0 && uploaded.uvBuffer !== null) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.uvBuffer);
        gl.enableVertexAttribArray(compiled.aUv);
        gl.vertexAttribPointer(compiled.aUv, 2, gl.FLOAT, false, 0, 0);
      }
      const btMat = mesh.material;
      if (btMat.atlas) {
        const webglTex = this._getWebGLTexture(btMat.atlas);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, webglTex);
        const uAtlas = gl.getUniformLocation(compiled.program, 'u_atlas');
        gl.uniform1i(uAtlas, 0);
      }
      const uColor = gl.getUniformLocation(compiled.program, 'u_color');
      gl.uniform3fv(uColor, btMat.color);
    }

    // PhongMaterial 专用：绑定法线 + 传递光照 uniforms
    if (mesh.material instanceof PhongMaterial && compiled.phong) {
      const phong = compiled.phong;
      const mat = mesh.material;
      const model = mesh.worldMatrix;

      // a_normal attribute
      if (phong.aNormal >= 0 && uploaded.normalBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.normalBuffer);
        gl.enableVertexAttribArray(phong.aNormal);
        gl.vertexAttribPointer(phong.aNormal, 3, gl.FLOAT, false, 0, 0);
      }

      // u_modelMatrix
      if (phong.uModelMatrix) {
        gl.uniformMatrix4fv(phong.uModelMatrix, false, model);
      }

      // u_normalMatrix（mat3，从 mat4 提取上左 3×3）
      if (phong.uNormalMatrix) {
        const nm = computeNormalMatrix(model);
        if (nm) {
          gl.uniformMatrix3fv(phong.uNormalMatrix, false, extractMat3(nm));
        }
      }

      // 光照 uniforms
      if (phong.uAmbientColor) gl.uniform3fv(phong.uAmbientColor, lightCtx.ambientColor);
      if (phong.uCameraPos)    gl.uniform3fv(phong.uCameraPos, lightCtx.cameraPos);

      // 多方向光
      if (phong.uNumDirLights) gl.uniform1i(phong.uNumDirLights, lightCtx.dirLights.length);
      for (let i = 0; i < lightCtx.dirLights.length; i++) {
        const dl = lightCtx.dirLights[i];
        const dirLoc = phong.uDirLightDirs[i];
        const colorLoc = phong.uDirLightColors[i];
        if (dirLoc)   gl.uniform3fv(dirLoc, dl.dir);
        if (colorLoc) gl.uniform3fv(colorLoc, dl.color);
      }

      // 点光源
      if (phong.uNumPointLights) gl.uniform1i(phong.uNumPointLights, lightCtx.pointLights.length);
      for (let i = 0; i < lightCtx.pointLights.length; i++) {
        const pl = lightCtx.pointLights[i];
        const posLoc  = phong.uPointLightPositions[i];
        const colLoc  = phong.uPointLightColors[i];
        const distLoc = phong.uPointLightDistances[i];
        const decLoc  = phong.uPointLightDecays[i];
        if (posLoc)  gl.uniform3fv(posLoc, pl.position);
        if (colLoc)  gl.uniform3fv(colLoc, pl.color);
        if (distLoc) gl.uniform1f(distLoc, pl.distance);
        if (decLoc)  gl.uniform1f(decLoc, pl.decay);
      }

      // 聚光灯
      if (phong.uNumSpotLights) gl.uniform1i(phong.uNumSpotLights, lightCtx.spotLights.length);
      for (let i = 0; i < lightCtx.spotLights.length; i++) {
        const sl = lightCtx.spotLights[i];
        const posLoc  = phong.uSpotLightPositions[i];
        const dirLoc  = phong.uSpotLightDirs[i];
        const colLoc  = phong.uSpotLightColors[i];
        const distLoc = phong.uSpotLightDistances[i];
        const decLoc  = phong.uSpotLightDecays[i];
        const cosLoc  = phong.uSpotLightCosAngles[i];
        const penLoc  = phong.uSpotLightPenumbras[i];
        if (posLoc)  gl.uniform3fv(posLoc, sl.position);
        if (dirLoc)  gl.uniform3fv(dirLoc, sl.direction);
        if (colLoc)  gl.uniform3fv(colLoc, sl.color);
        if (distLoc) gl.uniform1f(distLoc, sl.distance);
        if (decLoc)  gl.uniform1f(decLoc, sl.decay);
        if (cosLoc)  gl.uniform1f(cosLoc, sl.cosAngle);
        if (penLoc)  gl.uniform1f(penLoc, sl.cosInner);
      }

      // 材质属性 uniforms
      if (phong.uDiffuse)   gl.uniform3fv(phong.uDiffuse, mat.diffuse);
      if (phong.uSpecular)  gl.uniform3fv(phong.uSpecular, mat.specular);
      if (phong.uShininess) gl.uniform1f(phong.uShininess, mat.shininess);

      // 漫反射纹理贴图
      if (mat.map != null) {
        const webglTex = this._getWebGLTexture(mat.map);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, webglTex);
        if (phong.uMap)    gl.uniform1i(phong.uMap, 0);
        if (phong.uHasMap) gl.uniform1f(phong.uHasMap, 1.0);
        // 绑定 UV attribute
        if (compiled.aUv >= 0 && uploaded.uvBuffer) {
          gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.uvBuffer);
          gl.enableVertexAttribArray(compiled.aUv);
          gl.vertexAttribPointer(compiled.aUv, 2, gl.FLOAT, false, 0, 0);
        }
      } else {
        if (phong.uHasMap) gl.uniform1f(phong.uHasMap, 0.0);
      }

      // 自发光
      if (phong.uEmissive) gl.uniform3fv(phong.uEmissive, mat.emissive);
      if (mat.emissiveMap != null) {
        const webglTex = this._getWebGLTexture(mat.emissiveMap);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, webglTex);
        if (phong.uEmissiveMap)    gl.uniform1i(phong.uEmissiveMap, 1);
        if (phong.uHasEmissiveMap) gl.uniform1f(phong.uHasEmissiveMap, 1.0);
      } else {
        if (phong.uHasEmissiveMap) gl.uniform1f(phong.uHasEmissiveMap, 0.0);
      }

      // 法线贴图
      if (mat.normalMap != null) {
        const webglTex = this._getWebGLTexture(mat.normalMap);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, webglTex);
        if (phong.uNormalMap)    gl.uniform1i(phong.uNormalMap, 2);
        if (phong.uHasNormalMap) gl.uniform1f(phong.uHasNormalMap, 1.0);
        if (phong.uNormalScale)  gl.uniform1f(phong.uNormalScale, mat.normalScale);
        // 绑定切线 attribute
        if (phong.aTangent >= 0 && uploaded.tangentBuffer) {
          gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.tangentBuffer);
          gl.enableVertexAttribArray(phong.aTangent);
          gl.vertexAttribPointer(phong.aTangent, 4, gl.FLOAT, false, 0, 0);
        }
        // 绑定 UV attribute（TBN 采样需要 UV）
        if (compiled.aUv >= 0 && uploaded.uvBuffer) {
          gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.uvBuffer);
          gl.enableVertexAttribArray(compiled.aUv);
          gl.vertexAttribPointer(compiled.aUv, 2, gl.FLOAT, false, 0, 0);
        }
      } else {
        if (phong.uHasNormalMap) gl.uniform1f(phong.uHasNormalMap, 0.0);
      }

      // 高光贴图
      if (mat.specularMap != null) {
        const webglTex = this._getWebGLTexture(mat.specularMap);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, webglTex);
        if (phong.uSpecularMap)    gl.uniform1i(phong.uSpecularMap, 3);
        if (phong.uHasSpecularMap) gl.uniform1f(phong.uHasSpecularMap, 1.0);
        // 绑定 UV attribute（若未绑定）
        if (compiled.aUv >= 0 && uploaded.uvBuffer) {
          gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.uvBuffer);
          gl.enableVertexAttribArray(compiled.aUv);
          gl.vertexAttribPointer(compiled.aUv, 2, gl.FLOAT, false, 0, 0);
        }
      } else {
        if (phong.uHasSpecularMap) gl.uniform1f(phong.uHasSpecularMap, 0.0);
      }
    }

    // ShaderMaterial: 绑定 UV 属性 + 自定义 uniforms + 内置 uniforms
    if (mesh.material instanceof ShaderMaterial) {
      if (compiled.aUv >= 0 && uploaded.uvBuffer !== null) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.uvBuffer);
        gl.enableVertexAttribArray(compiled.aUv);
        gl.vertexAttribPointer(compiled.aUv, 2, gl.FLOAT, false, 0, 0);
      }

      // 内置 uniforms（可选 — shader 声明了才绑定）
      const uModelMatrix = gl.getUniformLocation(compiled.program, 'u_modelMatrix');
      gl.uniformMatrix4fv(uModelMatrix, false, mesh.worldMatrix);

      // 自定义 uniforms
      let textureUnit = 0;
      for (const [name, def] of Object.entries(mesh.material.uniforms)) {
        const loc = gl.getUniformLocation(compiled.program, name);
        switch (def.type) {
          case 'float':
            gl.uniform1f(loc, def.value as number);
            break;
          case 'int':
            gl.uniform1i(loc, def.value as number);
            break;
          case 'vec2':
            gl.uniform2fv(loc, def.value as number[]);
            break;
          case 'vec3':
            gl.uniform3fv(loc, def.value as number[]);
            break;
          case 'vec4':
            gl.uniform4fv(loc, def.value as number[]);
            break;
          case 'mat3':
            gl.uniformMatrix3fv(loc, false, def.value as Float32Array);
            break;
          case 'mat4':
            gl.uniformMatrix4fv(loc, false, def.value as Float32Array);
            break;
          case 'sampler2D': {
            const webglTex = this._getWebGLTexture(def.value as Texture);
            gl.activeTexture(gl.TEXTURE0 + textureUnit);
            gl.bindTexture(gl.TEXTURE_2D, webglTex);
            gl.uniform1i(loc, textureUnit);
            textureUnit++;
            break;
          }
        }
      }
    }

    // 上传雾效 uniforms
    if (applyFog && fog !== null && compiled.fogLoc) {
      const f = compiled.fogLoc;
      const c = fog.color;
      if (f.uFogColor) gl.uniform3f(f.uFogColor, c[0], c[1], c[2]);
      if (f.uFogNear)  gl.uniform1f(f.uFogNear, fog.near);
      if (f.uFogFar)   gl.uniform1f(f.uFogFar, fog.far);
      if (f.uModelMatrix) gl.uniformMatrix4fv(f.uModelMatrix, false, mesh.worldMatrix);
    }

    // Draw
    if (uploaded.indexBuffer !== null) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, uploaded.indexBuffer);
      gl.drawElements(gl.TRIANGLES, uploaded.indexCount, gl.UNSIGNED_SHORT, 0);
      this.info.drawCalls++;
      this.info.triangles += uploaded.indexCount / 3;
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, uploaded.vertexCount);
      this.info.drawCalls++;
      this.info.triangles += uploaded.vertexCount / 3;
    }

    // 恢复默认 GL 状态，避免状态泄漏
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
  }

  private _drawSkinnedMesh(mesh: SkinnedMesh, viewProj: Mat4): void {
    const gl = this.gl;
    const skin = this._getSkinningProgram();
    const uploaded = this._getGeometry(mesh.geometry);
    const mvp = multiply(viewProj, mesh.worldMatrix);

    gl.useProgram(skin.program);
    gl.uniformMatrix4fv(skin.uMvp, false, mvp);

    // 上传骨骼矩阵（flat Float32Array，每骨 16 个浮点数）
    gl.uniformMatrix4fv(skin.uBoneMatrices, false, mesh.skeleton.boneMatrices);

    // a_position
    if (skin.aPosition >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.positionBuffer);
      gl.enableVertexAttribArray(skin.aPosition);
      gl.vertexAttribPointer(skin.aPosition, 3, gl.FLOAT, false, 0, 0);
    }

    // a_color
    if (skin.aColor >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.colorBuffer);
      gl.enableVertexAttribArray(skin.aColor);
      gl.vertexAttribPointer(skin.aColor, 3, gl.FLOAT, false, 0, 0);
    }

    // a_joints
    if (skin.aJoints >= 0 && uploaded.jointsBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.jointsBuffer);
      gl.enableVertexAttribArray(skin.aJoints);
      gl.vertexAttribPointer(skin.aJoints, 4, gl.FLOAT, false, 0, 0);
    }

    // a_weights
    if (skin.aWeights >= 0 && uploaded.weightsBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, uploaded.weightsBuffer);
      gl.enableVertexAttribArray(skin.aWeights);
      gl.vertexAttribPointer(skin.aWeights, 4, gl.FLOAT, false, 0, 0);
    }

    // Draw
    if (uploaded.indexBuffer !== null) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, uploaded.indexBuffer);
      gl.drawElements(gl.TRIANGLES, uploaded.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, uploaded.vertexCount);
    }
  }

  // ── Line rendering ────────────────────────────────────────────────

  private _getLineProgramInfo(mat: LineMaterial): LineProgramInfo {
    const cached = this.lineProgramCache.get(mat);
    if (cached) return cached;

    const gl = this.gl;
    const vs = compileShader(gl, gl.VERTEX_SHADER, mat.vertexShader);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, mat.fragmentShader);
    const program = createProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const uMvpLoc = gl.getUniformLocation(program, 'u_mvp');
    if (!uMvpLoc) throw new Error('Line shader must define uniform mat4 u_mvp');

    const info: LineProgramInfo = {
      program,
      aPosition: gl.getAttribLocation(program, 'a_position'),
      aColor:    gl.getAttribLocation(program, 'a_color'),
      uMvp:      uMvpLoc,
      uColor:    gl.getUniformLocation(program, 'u_color'),
      uOpacity:  gl.getUniformLocation(program, 'u_opacity'),
    };
    this.lineProgramCache.set(mat, info);
    return info;
  }

  private _drawLine(line: Line, viewProj: Mat4): void {
    if (!line.visible) return;

    const gl = this.gl;
    const geo = line.geometry;
    const vertexCount = geo.positions.length / 3;
    if (vertexCount === 0) return;

    const mat = line.material;
    const prog = this._getLineProgramInfo(mat);

    // 上传顶点缓冲区（Line 几何可能动态变化，每帧创建）
    const posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.DYNAMIC_DRAW);

    const colBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, geo.colors, gl.DYNAMIC_DRAW);

    const mvp = multiply(viewProj, line.worldMatrix);

    gl.useProgram(prog.program);
    gl.uniformMatrix4fv(prog.uMvp, false, mvp);
    if (prog.uColor)   gl.uniform3fv(prog.uColor, mat.color);
    if (prog.uOpacity) gl.uniform1f(prog.uOpacity, mat.opacity);

    if (prog.aPosition >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(prog.aPosition);
      gl.vertexAttribPointer(prog.aPosition, 3, gl.FLOAT, false, 0, 0);
    }
    if (prog.aColor >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
      gl.enableVertexAttribArray(prog.aColor);
      gl.vertexAttribPointer(prog.aColor, 3, gl.FLOAT, false, 0, 0);
    }

    const glMode = line.drawMode === 'LINES'      ? gl.LINES
                 : line.drawMode === 'LINE_STRIP'  ? gl.LINE_STRIP
                 : GL_LINE_LOOP;

    gl.drawArrays(glMode, 0, vertexCount);

    gl.deleteBuffer(posBuffer);
    gl.deleteBuffer(colBuffer);
  }

  // ── Sprite rendering ──────────────────────────────────────────────

  private _getSpriteProgramInfo(mat: SpriteMaterial): SpriteProgramInfo {
    const cached = this.spriteProgramCache.get(mat);
    if (cached) return cached;

    const gl = this.gl;
    const vs = compileShader(gl, gl.VERTEX_SHADER, mat.vertexShader);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, mat.fragmentShader);
    const program = createProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const info: SpriteProgramInfo = {
      program,
      aPosition:   gl.getAttribLocation(program, 'a_position'),
      aUv:         gl.getAttribLocation(program, 'a_uv'),
      uModelView:  gl.getUniformLocation(program, 'u_modelView'),
      uProjection: gl.getUniformLocation(program, 'u_projection'),
      uColor:      gl.getUniformLocation(program, 'u_color'),
      uOpacity:    gl.getUniformLocation(program, 'u_opacity'),
      uHasTexture: gl.getUniformLocation(program, 'u_hasTexture'),
      uTexture:    gl.getUniformLocation(program, 'u_texture'),
    };
    this.spriteProgramCache.set(mat, info);
    return info;
  }

  private _getSpriteQuad(): SpriteQuad {
    if (this.spriteQuad) return this.spriteQuad;

    const gl = this.gl;

    // 单位四边形：4 顶点，中心在原点
    const positions = new Float32Array([
      -0.5, -0.5, 0,
       0.5, -0.5, 0,
       0.5,  0.5, 0,
      -0.5,  0.5, 0,
    ]);
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1,
    ]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const positionBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    this.spriteQuad = { positionBuffer, uvBuffer, indexBuffer };
    return this.spriteQuad;
  }

  private _drawSprite(sprite: Sprite, camera: Camera): void {
    if (!sprite.visible) return;

    const gl = this.gl;
    const mat = sprite.material;

    const quad = this._getSpriteQuad();
    const prog = this._getSpriteProgramInfo(mat);

    // 开启 alpha 混合
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // modelView = viewMatrix × worldMatrix
    const modelView = multiply(camera.viewMatrix, sprite.worldMatrix);

    gl.useProgram(prog.program);
    if (prog.uModelView)  gl.uniformMatrix4fv(prog.uModelView, false, modelView);
    if (prog.uProjection) gl.uniformMatrix4fv(prog.uProjection, false, camera.projectionMatrix);
    if (prog.uColor)      gl.uniform3fv(prog.uColor, mat.color);
    if (prog.uOpacity)    gl.uniform1f(prog.uOpacity, mat.opacity);

    if (mat.texture) {
      if (prog.uHasTexture) gl.uniform1f(prog.uHasTexture, 1.0);
      const webglTex = this._getWebGLTexture(mat.texture);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, webglTex);
      if (prog.uTexture) gl.uniform1i(prog.uTexture, 0);
    } else {
      if (prog.uHasTexture) gl.uniform1f(prog.uHasTexture, 0.0);
    }

    if (prog.aPosition >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad.positionBuffer);
      gl.enableVertexAttribArray(prog.aPosition);
      gl.vertexAttribPointer(prog.aPosition, 3, gl.FLOAT, false, 0, 0);
    }
    if (prog.aUv >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, quad.uvBuffer);
      gl.enableVertexAttribArray(prog.aUv);
      gl.vertexAttribPointer(prog.aUv, 2, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad.indexBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // 恢复混合状态
    gl.disable(gl.BLEND);
  }
}
