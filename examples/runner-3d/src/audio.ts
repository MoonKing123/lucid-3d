/**
 * GameAudio — 游戏音效管理器
 * 封装 AudioListener + AudioPool，支持脚步声/金币/撞击三种 3D 音效。
 * 在无 AudioContext 的 Node 测试环境中自动降级为 no-op stub。
 */
import { AudioListener } from '../../../src/audio/audio-listener';
import { AudioPool } from '../../../src/audio/audio-pool';
import type { AudioClip } from '../../../src/audio/audio-manager';

/** 检测 AudioContext 是否可用（Node 测试环境中不存在） */
function createAudioContext(): AudioContext | null {
  const AudioCtx =
    (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    return new AudioCtx();
  } catch {
    return null;
  }
}

/** 程序化生成短音效 buffer（避免依赖真实音频文件） */
function makeSynthBuffer(ctx: AudioContext, duration: number, freq: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-10 * t);
  }
  return buffer;
}

export class GameAudio {
  /** AudioContext 可用时为真实监听器，否则为 null（no-op 模式） */
  readonly listener: AudioListener | null;

  private footstepPool: AudioPool | null = null;
  private coinPool: AudioPool | null = null;
  private hitPool: AudioPool | null = null;

  private footstepClip: AudioClip | null = null;
  private coinClip: AudioClip | null = null;
  private hitClip: AudioClip | null = null;

  constructor() {
    const ctx = createAudioContext();
    if (!ctx) {
      // 无 AudioContext — no-op 模式（Node/jsdom 测试环境）
      this.listener = null;
      return;
    }
    try {
      this.listener = new AudioListener(ctx);
      this._setupPools(ctx);
    } catch {
      this.listener = null;
    }
  }

  private _setupPools(ctx: AudioContext): void {
    if (!this.listener) return;
    const dest = this.listener.getInput() as AudioNode;
    this.footstepPool = new AudioPool({ context: ctx, destination: dest, size: 4 });
    this.coinPool = new AudioPool({ context: ctx, destination: dest, size: 4 });
    this.hitPool = new AudioPool({ context: ctx, destination: dest, size: 2 });

    // 程序化生成三种音效
    this.footstepClip = { name: 'footstep', buffer: makeSynthBuffer(ctx, 0.1, 200), duration: 0.1 };
    this.coinClip = { name: 'coin', buffer: makeSynthBuffer(ctx, 0.2, 880), duration: 0.2 };
    this.hitClip = { name: 'hit', buffer: makeSynthBuffer(ctx, 0.15, 120), duration: 0.15 };
  }

  playFootstep(_position: [number, number, number]): void {
    if (!this.footstepPool || !this.footstepClip) return;
    this.footstepPool.play(this.footstepClip);
  }

  playCoin(_position: [number, number, number]): void {
    if (!this.coinPool || !this.coinClip) return;
    this.coinPool.play(this.coinClip);
  }

  playHit(_position: [number, number, number]): void {
    if (!this.hitPool || !this.hitClip) return;
    this.hitPool.play(this.hitClip);
  }

  /** 监听器跟随相机位置（每帧调用） */
  updateListener(cameraPosition: [number, number, number]): void {
    if (!this.listener) return;
    this.listener.position[0] = cameraPosition[0];
    this.listener.position[1] = cameraPosition[1];
    this.listener.position[2] = cameraPosition[2];
    this.listener.updateMatrixWorld();
  }

  dispose(): void {
    this.footstepPool?.dispose();
    this.coinPool?.dispose();
    this.hitPool?.dispose();
    this.listener?.dispose();
  }
}
