/**
 * PhongMaterial — Blinn-Phong 光照材质
 * 支持：漫反射贴图、自发光、多光源
 */

import { type Vec3, vec3 } from '../math/vec3';
import { Material } from './material';
import { Texture } from './texture';

const PHONG_VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  attribute vec2 a_uv;
  attribute vec4 a_tangent;
  uniform mat4 u_mvp;
  uniform mat4 u_modelMatrix;
  uniform mat3 u_normalMatrix;
  varying vec3 v_normal;
  varying vec3 v_worldPos;
  varying vec2 v_uv;
  varying vec3 v_tangent;
  varying vec3 v_bitangent;

  void main() {
    vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
    v_worldPos = worldPos.xyz;
    v_normal = u_normalMatrix * a_normal;
    v_uv = a_uv;
    v_tangent = u_normalMatrix * a_tangent.xyz;
    v_bitangent = cross(v_normal, v_tangent) * a_tangent.w;
    gl_Position = u_mvp * vec4(a_position, 1.0);
  }
`;

const PHONG_FRAGMENT_SHADER = `
  precision mediump float;
  // 向后兼容（单光源，保留声明供旧测试检查）
  uniform vec3 u_lightDir;
  uniform vec3 u_lightColor;
  uniform vec3 u_ambientColor;
  uniform vec3 u_cameraPos;
  uniform vec3 u_diffuse;
  uniform vec3 u_specular;
  uniform float u_shininess;
  // 多方向光数组
  uniform int u_numDirLights;
  uniform vec3 u_dirLightDirs[4];
  uniform vec3 u_dirLightColors[4];
  // 点光源数组
  uniform int u_numPointLights;
  uniform vec3 u_pointLightPositions[4];
  uniform vec3 u_pointLightColors[4];
  uniform float u_pointLightDistances[4];
  uniform float u_pointLightDecays[4];
  // 聚光灯数组
  uniform int u_numSpotLights;
  uniform vec3 u_spotLightPositions[4];
  uniform vec3 u_spotLightDirs[4];
  uniform vec3 u_spotLightColors[4];
  uniform float u_spotLightDistances[4];
  uniform float u_spotLightDecays[4];
  uniform float u_spotLightCosAngles[4];
  uniform float u_spotLightPenumbras[4];
  // 漫反射贴图
  uniform sampler2D u_map;
  uniform float u_hasMap;
  // 自发光
  uniform vec3 u_emissive;
  uniform sampler2D u_emissiveMap;
  uniform float u_hasEmissiveMap;
  // 法线贴图
  uniform sampler2D u_normalMap;
  uniform float u_hasNormalMap;
  uniform float u_normalScale;
  // 高光贴图
  uniform sampler2D u_specularMap;
  uniform float u_hasSpecularMap;
  varying vec3 v_normal;
  varying vec3 v_worldPos;
  varying vec2 v_uv;
  varying vec3 v_tangent;
  varying vec3 v_bitangent;

  void main() {
    vec3 N = normalize(v_normal);
    vec3 V = normalize(u_cameraPos - v_worldPos);

    if (u_hasNormalMap > 0.5) {
      vec3 mapN = texture2D(u_normalMap, v_uv).rgb * 2.0 - 1.0;
      mapN.xy *= u_normalScale;
      mat3 TBN = mat3(normalize(v_tangent), normalize(v_bitangent), N);
      N = normalize(TBN * mapN);
    }

    vec3 baseDiffuse = u_hasMap > 0.5
      ? texture2D(u_map, v_uv).rgb * u_diffuse
      : u_diffuse;

    vec3 baseSpecular = u_hasSpecularMap > 0.5
      ? texture2D(u_specularMap, v_uv).rgb * u_specular
      : u_specular;

    vec3 color = u_ambientColor * baseDiffuse;

    // 方向光循环
    for (int i = 0; i < 4; i++) {
      if (i >= u_numDirLights) break;
      vec3 L = normalize(-u_dirLightDirs[i]);
      vec3 H = normalize(L + V);
      float diff = max(dot(N, L), 0.0);
      float spec = pow(max(dot(N, H), 0.0), u_shininess);
      color += u_dirLightColors[i] * baseDiffuse * diff;
      color += u_dirLightColors[i] * baseSpecular * spec;
    }

    // 点光源循环
    for (int i = 0; i < 4; i++) {
      if (i >= u_numPointLights) break;
      vec3 lightVec = u_pointLightPositions[i] - v_worldPos;
      float d = length(lightVec);
      vec3 L = lightVec / max(d, 0.0001);
      vec3 H = normalize(L + V);
      float diff = max(dot(N, L), 0.0);
      float spec = pow(max(dot(N, H), 0.0), u_shininess);
      float dist = u_pointLightDistances[i];
      float decay = u_pointLightDecays[i];
      float attenuation;
      if (dist <= 0.0) {
        attenuation = 1.0 / max(pow(d, decay), 0.01);
      } else {
        attenuation = pow(max(1.0 - d / dist, 0.0), decay);
      }
      color += u_pointLightColors[i] * baseDiffuse * diff * attenuation;
      color += u_pointLightColors[i] * baseSpecular * spec * attenuation;
    }

    // 聚光灯循环
    for (int i = 0; i < 4; i++) {
      if (i >= u_numSpotLights) break;
      vec3 lightVec = u_spotLightPositions[i] - v_worldPos;
      float d = length(lightVec);
      vec3 L = lightVec / max(d, 0.0001);
      vec3 H = normalize(L + V);
      float diff = max(dot(N, L), 0.0);
      float spec = pow(max(dot(N, H), 0.0), u_shininess);
      // 距离衰减
      float dist = u_spotLightDistances[i];
      float decay = u_spotLightDecays[i];
      float distAttenuation;
      if (dist <= 0.0) {
        distAttenuation = 1.0 / max(pow(d, decay), 0.01);
      } else {
        distAttenuation = pow(max(1.0 - d / dist, 0.0), decay);
      }
      // 锥形衰减（smoothstep）
      float cosOuter = u_spotLightCosAngles[i];
      float penumbra = u_spotLightPenumbras[i];
      // cosInner = cos(angle * (1.0 - penumbra))，通过 cosOuter 反推 angle 再乘 (1-penumbra)
      // 直接用 acos 会在 GLSL 1.0 中精度不稳，改为在 CPU 端传 cosInner
      // 这里复用 penumbra 字段存储 cosInner
      float cosInner = penumbra; // 注：renderer 中传 cos(angle*(1-penumbra))
      float spotEffect = dot(normalize(v_worldPos - u_spotLightPositions[i]), u_spotLightDirs[i]);
      float spotAttenuation = smoothstep(cosOuter, cosInner, spotEffect);
      float attenuation = distAttenuation * spotAttenuation;
      color += u_spotLightColors[i] * baseDiffuse  * diff * attenuation;
      color += u_spotLightColors[i] * baseSpecular * spec * attenuation;
    }

    vec3 emissiveColor = u_hasEmissiveMap > 0.5
      ? u_emissive * texture2D(u_emissiveMap, v_uv).rgb
      : u_emissive;

    gl_FragColor = vec4(color + emissiveColor, 1.0);
  }
`;

export interface PhongMaterialOptions {
  ambient?: Vec3;
  diffuse?: Vec3;
  specular?: Vec3;
  shininess?: number;
  map?: Texture;
  emissive?: Vec3;
  emissiveMap?: Texture;
  normalMap?: Texture;
  normalScale?: number;
  specularMap?: Texture;
}

export class PhongMaterial extends Material {
  ambient: Vec3;
  diffuse: Vec3;
  specular: Vec3;
  shininess: number;
  map: Texture | null;
  emissive: Vec3;
  emissiveMap: Texture | null;
  normalMap: Texture | null;
  normalScale: number;
  specularMap: Texture | null;

  constructor(opts: PhongMaterialOptions = {}) {
    super({
      vertexShader: PHONG_VERTEX_SHADER,
      fragmentShader: PHONG_FRAGMENT_SHADER,
    });
    this.ambient      = opts.ambient      ?? vec3(0.1, 0.1, 0.1);
    this.diffuse      = opts.diffuse      ?? vec3(0.8, 0.8, 0.8);
    this.specular     = opts.specular     ?? vec3(1.0, 1.0, 1.0);
    this.shininess    = opts.shininess    ?? 32;
    this.map          = opts.map          ?? null;
    this.emissive     = opts.emissive     ?? vec3(0, 0, 0);
    this.emissiveMap  = opts.emissiveMap  ?? null;
    this.normalMap    = opts.normalMap    ?? null;
    this.normalScale  = opts.normalScale  ?? 1.0;
    this.specularMap  = opts.specularMap  ?? null;
  }

  /** 克隆 Phong 材质（Vec3 属性深拷贝，Texture 引用共享） */
  clone(): PhongMaterial {
    const m = new PhongMaterial({
      ambient:     vec3(this.ambient[0],  this.ambient[1],  this.ambient[2]),
      diffuse:     vec3(this.diffuse[0],  this.diffuse[1],  this.diffuse[2]),
      specular:    vec3(this.specular[0], this.specular[1], this.specular[2]),
      shininess:   this.shininess,
      map:         this.map          ?? undefined,
      emissive:    vec3(this.emissive[0], this.emissive[1], this.emissive[2]),
      emissiveMap: this.emissiveMap  ?? undefined,
      normalMap:   this.normalMap    ?? undefined,
      normalScale: this.normalScale,
      specularMap: this.specularMap  ?? undefined,
    });
    m.opacity     = this.opacity;
    m.transparent = this.transparent;
    return m;
  }
}
