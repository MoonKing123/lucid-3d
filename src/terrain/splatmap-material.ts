import type { Texture } from '../renderer/texture';

export interface SplatmapMaterialOptions {
  splatmap: Texture;
  layer0: Texture;
  layer1: Texture;
  layer2?: Texture | null;
  layer3?: Texture | null;
  tiling?: number | [number, number, number, number];
}

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_splatmap;
uniform sampler2D u_layer0;
uniform sampler2D u_layer1;
uniform sampler2D u_layer2;
uniform sampler2D u_layer3;
uniform float u_tiling0;
uniform float u_tiling1;
uniform float u_tiling2;
uniform float u_tiling3;
void main() {
  vec4 splat = texture2D(u_splatmap, v_uv);
  vec3 c0 = texture2D(u_layer0, v_uv * u_tiling0).rgb;
  vec3 c1 = texture2D(u_layer1, v_uv * u_tiling1).rgb;
  vec3 c2 = texture2D(u_layer2, v_uv * u_tiling2).rgb;
  vec3 c3 = texture2D(u_layer3, v_uv * u_tiling3).rgb;
  float total = splat.r + splat.g + splat.b + splat.a + 1e-5;
  vec3 color = (c0 * splat.r + c1 * splat.g + c2 * splat.b + c3 * splat.a) / total;
  gl_FragColor = vec4(color, 1.0);
}
`.trim();

export class SplatmapMaterial {
  splatmap: Texture;
  layer0: Texture;
  layer1: Texture;
  layer2: Texture | null;
  layer3: Texture | null;
  tiling: [number, number, number, number];
  fragmentShader: string;
  uniforms: Record<string, unknown>;

  constructor(opts: SplatmapMaterialOptions) {
    if (!opts.layer0) throw new Error('SplatmapMaterial: layer0 是必填项');
    if (!opts.layer1) throw new Error('SplatmapMaterial: layer1 是必填项');

    this.splatmap = opts.splatmap;
    this.layer0 = opts.layer0;
    this.layer1 = opts.layer1;
    this.layer2 = opts.layer2 ?? null;
    this.layer3 = opts.layer3 ?? null;

    if (Array.isArray(opts.tiling)) {
      this.tiling = opts.tiling as [number, number, number, number];
    } else {
      const t = opts.tiling ?? 1;
      this.tiling = [t, t, t, t];
    }

    this.fragmentShader = FRAG;

    this.uniforms = {
      u_splatmap: this.splatmap,
      u_layer0: this.layer0,
      u_layer1: this.layer1,
      u_layer2: this.layer2,
      u_layer3: this.layer3,
      u_tiling0: this.tiling[0],
      u_tiling1: this.tiling[1],
      u_tiling2: this.tiling[2],
      u_tiling3: this.tiling[3],
    };
  }
}
