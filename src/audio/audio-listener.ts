/**
 * AudioListener — 3D 空间音频监听器。
 * 继承 Node3D，通过 Web Audio API 的 AudioListener 同步空间位置和朝向。
 */

import { Node3D } from '../core/node3d';

export class AudioListener extends Node3D {
  readonly context: AudioContext;
  readonly gain: GainNode;

  constructor(context?: AudioContext) {
    super('AudioListener');
    this.context = context ?? new AudioContext();
    this.gain = this.context.createGain();
    this.gain.gain.value = 1;
    this.gain.connect(this.context.destination as unknown as AudioNode);
  }

  setMasterVolume(value: number): void {
    this.gain.gain.value = Math.max(0, Math.min(1, value));
  }

  getMasterVolume(): number {
    return this.gain.gain.value;
  }

  /** 返回音频源连接的输入节点（gain node）。 */
  getInput(): GainNode {
    return this.gain;
  }

  /**
   * 同步 Web Audio API listener 的位置和朝向到节点世界矩阵。
   * 使用 setPosition/setOrientation（WeChat 兼容）。
   * 每帧调用一次。
   */
  updateMatrixWorld(): void {
    const m = this.worldMatrix;
    // 列优先：位置在列 3，索引 [12],[13],[14]
    const x = m[12];
    const y = m[13];
    const z = m[14];
    // 前向方向：-Z 轴（列 2 取负），索引 [8],[9],[10]
    const fx = -m[8];
    const fy = -m[9];
    const fz = -m[10];

    const nativeListener = (this.context as any).listener;
    nativeListener.setPosition(x, y, z);
    nativeListener.setOrientation(fx, fy, fz, 0, 1, 0);
  }

  dispose(): void {
    this.gain.disconnect();
    this.context.close();
  }
}
