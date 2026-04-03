/**
 * AudioPool — 固定大小的音频通道池，用于频繁播放一次性 SFX。
 * 避免每次播放创建/连接新节点的 GC 压力。
 */

import type { AudioClip } from './audio-manager';

export interface AudioPoolOptions {
  size?: number;           // 默认 8
  context: AudioContext;
  destination: AudioNode;  // 通常是 listener.getInput()
}

interface Channel {
  gain: GainNode;
  source: AudioBufferSourceNode | null;
  isActive: boolean;
}

export class AudioPool {
  readonly size: number;

  private context: AudioContext;
  private channels: Channel[];

  constructor(options: AudioPoolOptions) {
    this.size = options.size ?? 8;
    this.context = options.context;

    // 预分配 size 个 GainNode 通道，连接到 destination
    this.channels = [];
    for (let i = 0; i < this.size; i++) {
      const gain = this.context.createGain();
      gain.connect(options.destination);
      this.channels.push({ gain, source: null, isActive: false });
    }
  }

  play(clip: AudioClip, volume = 1): number {
    // 找第一个空闲通道
    const idx = this.channels.findIndex(ch => !ch.isActive);
    if (idx === -1) return -1;

    const channel = this.channels[idx];
    channel.gain.gain.value = volume;

    const source = this.context.createBufferSource();
    source.buffer = clip.buffer;
    source.connect(channel.gain);

    // source 结束时自动回收通道
    source.onended = () => {
      channel.source = null;
      channel.isActive = false;
    };

    source.start();
    channel.source = source;
    channel.isActive = true;

    return idx;
  }

  stop(index: number): void {
    const channel = this.channels[index];
    if (!channel || !channel.isActive) return;

    try {
      channel.source?.stop();
    } catch {
      // 节点已停止，忽略
    }
    channel.source = null;
    channel.isActive = false;
  }

  stopAll(): void {
    for (let i = 0; i < this.size; i++) {
      this.stop(i);
    }
  }

  get activeCount(): number {
    return this.channels.filter(ch => ch.isActive).length;
  }

  dispose(): void {
    this.stopAll();
    for (const channel of this.channels) {
      channel.gain.disconnect();
    }
  }
}
