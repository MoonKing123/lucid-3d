import { FollowCamera } from '../../../src/core/follow-camera';
import { Player } from './player';
import { vec3 } from '../../../src/math/vec3';

/**
 * 为玩家创建第三人称跟随相机。
 * 偏移：玩家身后 8m、上方 4m；注视点偏移 1m 头部；阻尼 0.15。
 */
export function createPlayerFollowCamera(player: Player): FollowCamera {
  const cam = new FollowCamera({
    offset: vec3(0, 4, -8),
    lookAtOffset: vec3(0, 1, 0),
    damping: 0.15,
  });
  cam.target = player.node;
  cam.aspect = 16 / 9;
  cam.fov = Math.PI / 3;
  cam.near = 0.1;
  cam.far = 200;
  // projectionMatrix 是按需计算的 getter，无需 updateProjection()
  return cam;
}
