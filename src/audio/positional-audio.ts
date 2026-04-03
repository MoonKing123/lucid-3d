/**
 * PositionalAudio — 3D 定位音频源。
 * 继承 Node3D，通过 Web Audio PannerNode 实现 3D 空间定位声音。
 * 音频链路：source → gainNode → panner → listener.getInput()
 */

import { Node3D } from '../core/node3d';
import type { AudioListener } from './audio-listener';

export type DistanceModel = 'linear' | 'inverse' | 'exponential';

export interface PositionalAudioOptions {
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  distanceModel?: DistanceModel;
}

export interface AudioClip {
  name: string;
  buffer: AudioBuffer;
  duration: number;
}

export class PositionalAudio extends Node3D {
  readonly panner: PannerNode;
  readonly context: AudioContext;

  private _gainNode: GainNode;
  private _source: AudioBufferSourceNode | null = null;
  private _playing = false;
  private _loop = false;

  constructor(listener: AudioListener, options?: PositionalAudioOptions) {
    super('PositionalAudio');

    this.context = listener.context;
    this._gainNode = this.context.createGain();
    this.panner = this.context.createPanner();

    // 配置 PannerNode 属性
    (this.panner as any).panningModel = 'HRTF';
    this.panner.distanceModel = (options?.distanceModel ?? 'inverse') as DistanceModelType;
    this.panner.refDistance = options?.refDistance ?? 1;
    this.panner.maxDistance = options?.maxDistance ?? 10000;
    this.panner.rolloffFactor = options?.rolloffFactor ?? 1;

    // 连接音频链路：gainNode → panner → listener.getInput()
    this._gainNode.connect(this.panner as unknown as AudioNode);
    this.panner.connect(listener.getInput() as unknown as AudioNode);
  }

  play(clip: AudioClip): void {
    if (this._playing) {
      this.stop();
    }

    this._source = this.context.createBufferSource();
    this._source.buffer = clip.buffer;
    this._source.loop = this._loop;
    this._source.connect(this._gainNode as unknown as AudioNode);

    this._source.onended = () => {
      this._playing = false;
    };

    this._source.start();
    this._playing = true;
  }

  stop(): void {
    if (this._source) {
      this._source.onended = null;
      try {
        this._source.stop();
      } catch {
        // 忽略已停止的源节点抛出的错误
      }
      this._source = null;
    }
    this._playing = false;
  }

  setVolume(value: number): void {
    this._gainNode.gain.value = value;
  }

  getVolume(): number {
    return this._gainNode.gain.value;
  }

  setLoop(value: boolean): void {
    this._loop = value;
    if (this._source) {
      this._source.loop = value;
    }
  }

  getLoop(): boolean {
    return this._loop;
  }

  isPlaying(): boolean {
    return this._playing;
  }

  setRefDistance(value: number): void {
    this.panner.refDistance = value;
  }

  setMaxDistance(value: number): void {
    this.panner.maxDistance = value;
  }

  setRolloffFactor(value: number): void {
    this.panner.rolloffFactor = value;
  }

  setDistanceModel(model: DistanceModel): void {
    this.panner.distanceModel = model as DistanceModelType;
  }

  /**
   * 同步 panner 位置到节点世界坐标。每帧调用一次。
   * 使用 setPosition（WeChat 兼容）。
   */
  updateMatrixWorld(): void {
    const m = this.worldMatrix;
    // 列优先：位置在列 3，索引 [12],[13],[14]
    const x = m[12];
    const y = m[13];
    const z = m[14];
    (this.panner as any).setPosition(x, y, z);
  }

  dispose(): void {
    this.stop();
    this._gainNode.disconnect();
    this.panner.disconnect();
  }
}
