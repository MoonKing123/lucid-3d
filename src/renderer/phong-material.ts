/**
 * PhongMaterial — Blinn-Phong 光照材质
 */

import { type Vec3, vec3 } from '../math/vec3';
import { Material } from './material';

const PHONG_VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec3 a_normal;
  uniform mat4 u_mvp;
  uniform mat4 u_modelMatrix;
  uniform mat3 u_normalMatrix;
  varying vec3 v_normal;
  varying vec3 v_worldPos;

  void main() {
    vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
    v_worldPos = worldPos.xyz;
    v_normal = u_normalMatrix * a_normal;
    gl_Position = u_mvp * vec4(a_position, 1.0);
  }
`;

const PHONG_FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec3 u_lightDir;
  uniform vec3 u_lightColor;
  uniform vec3 u_ambientColor;
  uniform vec3 u_cameraPos;
  uniform vec3 u_diffuse;
  uniform vec3 u_specular;
  uniform float u_shininess;
  varying vec3 v_normal;
  varying vec3 v_worldPos;

  void main() {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(-u_lightDir);
    vec3 V = normalize(u_cameraPos - v_worldPos);
    vec3 H = normalize(L + V);

    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), u_shininess);

    vec3 ambient  = u_ambientColor * u_diffuse;
    vec3 diffuse  = u_lightColor * u_diffuse * diff;
    vec3 specular = u_lightColor * u_specular * spec;

    gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
  }
`;

export interface PhongMaterialOptions {
  ambient?: Vec3;
  diffuse?: Vec3;
  specular?: Vec3;
  shininess?: number;
}

export class PhongMaterial extends Material {
  ambient: Vec3;
  diffuse: Vec3;
  specular: Vec3;
  shininess: number;

  constructor(opts: PhongMaterialOptions = {}) {
    super({
      vertexShader: PHONG_VERTEX_SHADER,
      fragmentShader: PHONG_FRAGMENT_SHADER,
    });
    this.ambient   = opts.ambient   ?? vec3(0.1, 0.1, 0.1);
    this.diffuse   = opts.diffuse   ?? vec3(0.8, 0.8, 0.8);
    this.specular  = opts.specular  ?? vec3(1.0, 1.0, 1.0);
    this.shininess = opts.shininess ?? 32;
  }
}
