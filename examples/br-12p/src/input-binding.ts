/**
 * input-binding — 将 InputManager 绑定到 Player 和 FPSCamera。
 * WASD / Space / Shift 由 Player.update() 直接读取 InputManager.isKeyDown()，
 * 鼠标移动（pointermove）在此处监听并转发到 FPSCamera.applyMouseDelta()。
 */

import { InputManager } from '../../../src/core/input';
import { type FPSCamera } from './fps-camera';

/**
 * 绑定鼠标移动事件到 FPSCamera 视角旋转。
 * 通过计算相邻 pointermove 的位移来获取 delta。
 */
export function bindInput(input: InputManager, fpsCamera: FPSCamera): void {
  let prevX = 0;
  let prevY = 0;
  let hasPointer = false;

  input.on('pointerdown', (e) => {
    prevX = e.x ?? 0;
    prevY = e.y ?? 0;
    hasPointer = true;
  });

  input.on('pointerup', () => {
    hasPointer = false;
  });

  input.on('pointermove', (e) => {
    const x = e.x ?? 0;
    const y = e.y ?? 0;

    if (hasPointer) {
      const dx = x - prevX;
      const dy = y - prevY;
      fpsCamera.applyMouseDelta(dx, dy);
    }

    prevX = x;
    prevY = y;
  });
}
