/**
 * STUB — AudioManager (not yet implemented).
 * @see test/unit/audio/audio-manager.test.ts
 */
export const __STUB__ = true;

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

  constructor() {
    this.context = null as unknown as AudioContext;
    this.masterVolume = 1;
    throw new Error('Not implemented');
  }

  loadClip(_name: string, _data: ArrayBuffer): Promise<AudioClip> {
    throw new Error('Not implemented');
  }

  playSFX(_clip: AudioClip, _options?: PlaySFXOptions): AudioBufferSourceNode {
    throw new Error('Not implemented');
  }

  playBGM(_clip: AudioClip, _options?: PlayBGMOptions): void {
    throw new Error('Not implemented');
  }

  stopBGM(): void {
    throw new Error('Not implemented');
  }

  pauseBGM(): void {
    throw new Error('Not implemented');
  }

  resumeBGM(): void {
    throw new Error('Not implemented');
  }

  isBGMPlaying(): boolean {
    throw new Error('Not implemented');
  }

  dispose(): void {
    throw new Error('Not implemented');
  }
}
