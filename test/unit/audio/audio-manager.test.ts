/**
 * Pre-written tests for AudioManager — WebAudio wrapper for SFX and BGM.
 * AI must implement src/audio/audio-manager.ts to make these pass.
 *
 * API:
 *   interface AudioClip { name: string; buffer: AudioBuffer; duration: number; }
 *   interface PlaySFXOptions { volume?: number; loop?: boolean; }
 *   interface PlayBGMOptions { volume?: number; }
 *
 *   class AudioManager {
 *     readonly context: AudioContext;
 *     masterVolume: number;
 *
 *     constructor();
 *     loadClip(name: string, data: ArrayBuffer): Promise<AudioClip>;
 *     playSFX(clip: AudioClip, options?: PlaySFXOptions): AudioBufferSourceNode;
 *     playBGM(clip: AudioClip, options?: PlayBGMOptions): void;
 *     stopBGM(): void;
 *     pauseBGM(): void;
 *     resumeBGM(): void;
 *     isBGMPlaying(): boolean;
 *     dispose(): void;
 *   }
 *
 * Implementation notes:
 * - Uses AudioContext (or webkitAudioContext fallback for WeChat)
 * - masterVolume: GainNode connected to context.destination
 * - playSFX: creates source → gain → masterGain → destination
 * - playBGM: single BGM at a time; stopBGM stops current before starting new
 * - pauseBGM/resumeBGM: use context.suspend()/resume()
 * - dispose: close AudioContext
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as mod from '../../../src/audio/audio-manager';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { AudioManager } = mod;

function setupMockAudioContext() {
  const mockGainNode = {
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockSourceNode = {
    buffer: null as AudioBuffer | null,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  const mockBuffer: AudioBuffer = {
    duration: 2.5,
    length: 44100 * 2.5,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: vi.fn(() => new Float32Array(44100)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  };

  const mockContext = {
    state: 'running' as string,
    destination: { maxChannelCount: 2 },
    currentTime: 0,
    sampleRate: 44100,
    createGain: vi.fn(() => ({ ...mockGainNode })),
    createBufferSource: vi.fn(() => ({ ...mockSourceNode })),
    decodeAudioData: vi.fn((_data: ArrayBuffer) => Promise.resolve(mockBuffer)),
    suspend: vi.fn(() => {
      mockContext.state = 'suspended';
      return Promise.resolve();
    }),
    resume: vi.fn(() => {
      mockContext.state = 'running';
      return Promise.resolve();
    }),
    close: vi.fn(() => {
      mockContext.state = 'closed';
      return Promise.resolve();
    }),
  };

  // @ts-expect-error — mock global
  globalThis.AudioContext = vi.fn(() => mockContext);

  return { mockContext, mockBuffer, mockGainNode, mockSourceNode };
}

function teardownMockAudioContext() {
  // @ts-expect-error — cleanup mock
  delete globalThis.AudioContext;
}

/* ───────────── Construction ───────────── */

describeImpl('AudioManager — construction', () => {
  let mocks: ReturnType<typeof setupMockAudioContext>;

  beforeEach(() => { mocks = setupMockAudioContext(); });
  afterEach(() => teardownMockAudioContext());

  it('should create an AudioContext', () => {
    const am = new AudioManager();
    expect(am.context).toBeDefined();
  });

  it('should default masterVolume to 1', () => {
    const am = new AudioManager();
    expect(am.masterVolume).toBe(1);
  });
});

/* ───────────── loadClip ───────────── */

describeImpl('AudioManager — loadClip', () => {
  let mocks: ReturnType<typeof setupMockAudioContext>;

  beforeEach(() => { mocks = setupMockAudioContext(); });
  afterEach(() => teardownMockAudioContext());

  it('should decode audio data and return a clip', async () => {
    const am = new AudioManager();
    const data = new ArrayBuffer(100);
    const clip = await am.loadClip('test-sfx', data);

    expect(clip.name).toBe('test-sfx');
    expect(clip.buffer).toBe(mocks.mockBuffer);
    expect(clip.duration).toBe(mocks.mockBuffer.duration);
  });

  it('should call decodeAudioData with the provided buffer', async () => {
    const am = new AudioManager();
    const data = new ArrayBuffer(200);
    await am.loadClip('test', data);

    expect(mocks.mockContext.decodeAudioData).toHaveBeenCalledWith(data);
  });
});

/* ───────────── playSFX ───────────── */

describeImpl('AudioManager — playSFX', () => {
  let mocks: ReturnType<typeof setupMockAudioContext>;

  beforeEach(() => { mocks = setupMockAudioContext(); });
  afterEach(() => teardownMockAudioContext());

  it('should create a buffer source and start playback', async () => {
    const am = new AudioManager();
    const clip = await am.loadClip('boom', new ArrayBuffer(100));
    const source = am.playSFX(clip);

    expect(mocks.mockContext.createBufferSource).toHaveBeenCalled();
    expect(source.start).toHaveBeenCalled();
  });

  it('should connect source through gain to master', async () => {
    const am = new AudioManager();
    const clip = await am.loadClip('click', new ArrayBuffer(50));
    const source = am.playSFX(clip);

    expect(source.connect).toHaveBeenCalled();
  });

  it('should set loop when option is true', async () => {
    const am = new AudioManager();
    const clip = await am.loadClip('loop-sfx', new ArrayBuffer(50));
    const source = am.playSFX(clip, { loop: true });

    expect(source.loop).toBe(true);
  });
});

/* ───────────── BGM ───────────── */

describeImpl('AudioManager — BGM', () => {
  let mocks: ReturnType<typeof setupMockAudioContext>;

  beforeEach(() => { mocks = setupMockAudioContext(); });
  afterEach(() => teardownMockAudioContext());

  it('playBGM should start music', async () => {
    const am = new AudioManager();
    const clip = await am.loadClip('bgm', new ArrayBuffer(100));
    am.playBGM(clip);
    expect(am.isBGMPlaying()).toBe(true);
  });

  it('stopBGM should stop music', async () => {
    const am = new AudioManager();
    const clip = await am.loadClip('bgm', new ArrayBuffer(100));
    am.playBGM(clip);
    am.stopBGM();
    expect(am.isBGMPlaying()).toBe(false);
  });

  it('stopBGM without playing should not throw', () => {
    const am = new AudioManager();
    expect(() => am.stopBGM()).not.toThrow();
  });

  it('playBGM should stop previous BGM before starting new one', async () => {
    const am = new AudioManager();
    const clip1 = await am.loadClip('bgm1', new ArrayBuffer(100));
    const clip2 = await am.loadClip('bgm2', new ArrayBuffer(100));
    am.playBGM(clip1);
    am.playBGM(clip2);
    expect(am.isBGMPlaying()).toBe(true);
  });
});

/* ───────────── Pause / Resume ───────────── */

describeImpl('AudioManager — pause / resume', () => {
  let mocks: ReturnType<typeof setupMockAudioContext>;

  beforeEach(() => { mocks = setupMockAudioContext(); });
  afterEach(() => teardownMockAudioContext());

  it('pauseBGM should suspend the context', async () => {
    const am = new AudioManager();
    const clip = await am.loadClip('bgm', new ArrayBuffer(100));
    am.playBGM(clip);
    am.pauseBGM();
    expect(mocks.mockContext.suspend).toHaveBeenCalled();
  });

  it('resumeBGM should resume the context', async () => {
    const am = new AudioManager();
    const clip = await am.loadClip('bgm', new ArrayBuffer(100));
    am.playBGM(clip);
    am.pauseBGM();
    am.resumeBGM();
    expect(mocks.mockContext.resume).toHaveBeenCalled();
  });

  it('isBGMPlaying should be false when paused', async () => {
    const am = new AudioManager();
    const clip = await am.loadClip('bgm', new ArrayBuffer(100));
    am.playBGM(clip);
    am.pauseBGM();
    expect(am.isBGMPlaying()).toBe(false);
  });
});

/* ───────────── Dispose ───────────── */

describeImpl('AudioManager — dispose', () => {
  let mocks: ReturnType<typeof setupMockAudioContext>;

  beforeEach(() => { mocks = setupMockAudioContext(); });
  afterEach(() => teardownMockAudioContext());

  it('dispose should close the AudioContext', () => {
    const am = new AudioManager();
    am.dispose();
    expect(mocks.mockContext.close).toHaveBeenCalled();
  });
});
