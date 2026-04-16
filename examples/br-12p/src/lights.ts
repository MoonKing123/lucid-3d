/**
 * Lights — BR-12P 场景光源。
 * 户外战场光照：方向光（太阳）+ 环境光（天空散射）。
 */

import { AmbientLight, DirectionalLight } from '../../../src/core/light';
import { vec3 } from '../../../src/math/vec3';

export function createLights(): { sun: DirectionalLight; ambient: AmbientLight } {
  // 正午偏斜阳光
  const sun = new DirectionalLight(
    vec3(1.0, 0.95, 0.85),  // 暖白色
    1.3,
    vec3(-0.4, -1.0, -0.4), // 光线方向（从东北上方射来）
  );

  // 天光补光：蓝灰色
  const ambient = new AmbientLight(
    vec3(0.5, 0.6, 0.75),
    0.35,
  );

  return { sun, ambient };
}
