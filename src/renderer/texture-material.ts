/**
 * TextureMaterial — 纹理贴图材质
 */

import { Material } from './material';
import { Texture } from './texture';

const TEXTURE_VERTEX_SHADER = `
  attribute vec3 a_position;
  attribute vec2 a_uv;
  uniform mat4 u_mvp;
  varying vec2 v_uv;

  void main() {
    gl_Position = u_mvp * vec4(a_position, 1.0);
    v_uv = a_uv;
  }
`;

const TEXTURE_FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_uv;

  void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
  }
`;

export class TextureMaterial extends Material {
  texture: Texture;

  constructor(texture: Texture) {
    super({
      vertexShader: TEXTURE_VERTEX_SHADER,
      fragmentShader: TEXTURE_FRAGMENT_SHADER,
    });
    this.texture = texture;
  }
}
