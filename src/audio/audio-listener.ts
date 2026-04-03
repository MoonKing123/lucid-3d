/**
 * AudioListener — 3D 空间音频监听器。
 * 作为监听点挂载在 Camera 下，将 Node3D 的世界坐标同步到 Web Audio API。
 */

import { Node3D } from '../core/node3d';

export class AudioListener extends Node3D {
  readonly context: AudioContext;
  readonly gain: GainNode;

  constructor(context?: AudioContext) {
    super('AudioListener');
    // 使用传入的 context 或创建新的
    this.context = context ?? new AudioContext();
    // 创建主音量 GainNode，连接到 destination
    this.gain = this.context.createGain();
    this.gain.connect(this.context.destination);
    this.gain.gain.value = 1;
  }

  /** 设置主音量，clamp 到 [0, 1] */
  setMasterVolume(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.gain.gain.value = clamped;
  }

  /** 获取当前主音量 */
  getMasterVolume(): number {
    return this.gain.gain.value;
  }

  /** 返回 GainNode 供音频源接入 */
  getInput(): GainNode {
    return this.gain;
  }

  /**
   * 将世界矩阵中的位置和朝向同步到 Web Audio API listener。
   * 使用 setPosition / setOrientation（微信小游戏兼容性）。
   * 每帧在场景图更新后调用一次。
   */
  updateMatrixWorld(): void {
    const m = this.worldMatrix;
    // column-major Mat4: 位置在第 3 列，索引 12, 13, 14
    const px = m[12];
    const py = m[13];
    const pz = m[14];

    // 第 2 列为本地 Z 轴，索引 8, 9, 10；Forward = -col2
    let fx = -m[8];
    let fy = -m[9];
    let fz = -m[10];
    // 归一化 forward
    const fLen = Math.sqrt(fx * fx + fy * fy + fz * fz);
    if (fLen > 0) { fx /= fLen; fy /= fLen; fz /= fLen; }

    // 第 1 列为本地 Y 轴（up），索引 4, 5, 6
    let ux = m[4];
    let uy = m[5];
    let uz = m[6];
    const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
    if (uLen > 0) { ux /= uLen; uy /= uLen; uz /= uLen; }

    this.context.listener.setPosition(px, py, pz);
    this.context.listener.setOrientation(fx, fy, fz, ux, uy, uz);
  }

  /** 断开连接并关闭 AudioContext */
  dispose(): void {
    this.gain.disconnect();
    this.context.close();
  }
}
