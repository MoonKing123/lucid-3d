/**
 * AudioManager — 基于 Web Audio API 的音频管理器
 * 支持 BGM 循环播放和 SFX 一次性播放，带主音量控制
 */

export interface AudioClip {
  name: string;
  buffer: AudioBuffer;
  duration: number;
}

export interface PlaySFXOptions {
  volume?: number;
  loop?: boolean;
}

export interface PlayBGMOptions {
  volume?: number;
}

export class AudioManager {
  readonly context: AudioContext;
  masterVolume: number;

  private masterGain: GainNode;
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmPlaying: boolean = false;

  constructor() {
    // 支持 WeChat 小游戏的 webkitAudioContext 回退
    const AudioCtx =
      (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    this.context = new AudioCtx();
    this.masterVolume = 1;
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.context.destination);
  }

  async loadClip(name: string, data: ArrayBuffer): Promise<AudioClip> {
    const buffer = await this.context.decodeAudioData(data);
    return { name, buffer, duration: buffer.duration };
  }

  playSFX(clip: AudioClip, options?: PlaySFXOptions): AudioBufferSourceNode {
    const source = this.context.createBufferSource();
    source.buffer = clip.buffer;

    if (options?.loop) {
      source.loop = true;
    }

    const gain = this.context.createGain();
    if (options?.volume !== undefined) {
      gain.gain.value = options.volume;
    }

    // 连接链：source → gain → masterGain → destination
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    return source;
  }

  playBGM(clip: AudioClip, options?: PlayBGMOptions): void {
    // 先停止当前 BGM
    this.stopBGM();

    const source = this.context.createBufferSource();
    source.buffer = clip.buffer;
    source.loop = true;

    const gain = this.context.createGain();
    if (options?.volume !== undefined) {
      gain.gain.value = options.volume;
    }

    // 连接链：source → gain → masterGain → destination
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();

    this.bgmSource = source;
    this.bgmPlaying = true;
  }

  stopBGM(): void {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch {
        // 节点已停止，忽略错误
      }
      this.bgmSource = null;
    }
    this.bgmPlaying = false;
  }

  pauseBGM(): void {
    this.context.suspend();
    this.bgmPlaying = false;
  }

  resumeBGM(): void {
    this.context.resume();
    if (this.bgmSource) {
      this.bgmPlaying = true;
    }
  }

  isBGMPlaying(): boolean {
    return this.bgmPlaying;
  }

  dispose(): void {
    this.stopBGM();
    this.context.close();
  }
}
