import { AmbientLight } from '../../../src/core/light';
import { DirectionalLight } from '../../../src/core/light';
import { vec3 } from '../../../src/math/vec3';

/**
 * 创建 SLG 场景光源：太阳方向光 + 天光补光。
 */
export function createLights(): { sun: DirectionalLight; ambient: AmbientLight } {
  // 太阳：约 45° 斜射，偏西南方向
  const sun = new DirectionalLight(
    vec3(1.0, 0.95, 0.85), // 暖白色
    1.2,
    vec3(-0.5, -1.0, -0.5), // 光线方向（从东北上方射来）
  );

  // 天光：蓝灰色补光，模拟天空散射
  const ambient = new AmbientLight(
    vec3(0.5, 0.6, 0.75),
    0.4,
  );

  return { sun, ambient };
}
