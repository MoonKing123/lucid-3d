/**
 * Scene — 场景图的根容器，支持背景色、雾效配置和自动光源收集。
 * @see test/unit/core/scene.test.ts
 */

import { Node3D } from './node3d';
import { type Vec3, vec3 } from '../math/vec3';
import { AmbientLight, DirectionalLight } from './light';
import { PointLight } from './point-light';
import { SpotLight } from './spot-light';
import { CubeTexture } from '../renderer/cube-texture';

export interface FogOptions {
  color: Vec3;
  near: number;
  far: number;
}

export interface SceneOptions {
  background?: Vec3 | CubeTexture;
  fog?: FogOptions;
}

export interface CollectedLights {
  ambient: AmbientLight[];
  directional: DirectionalLight[];
  point: PointLight[];
  spot: SpotLight[];
}

export class Scene extends Node3D {
  background: Vec3 | CubeTexture;
  fog: FogOptions | null;

  constructor(opts?: SceneOptions) {
    super('scene');
    this.background = opts?.background ?? vec3(0.1, 0.1, 0.1);
    this.fog = opts?.fog ?? null;
  }

  /** DFS 遍历收集所有光源节点 */
  collectLights(): CollectedLights {
    const result: CollectedLights = {
      ambient: [],
      directional: [],
      point: [],
      spot: [],
    };

    this.traverse((node) => {
      if (node instanceof AmbientLight) {
        result.ambient.push(node);
      } else if (node instanceof DirectionalLight) {
        result.directional.push(node);
      } else if (node instanceof SpotLight) {
        result.spot.push(node);
      } else if (node instanceof PointLight) {
        result.point.push(node);
      }
    });

    return result;
  }
}
