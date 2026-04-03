/**
 * Pre-written tests for PositionalAudio — 3D positioned audio source.
 * AI must implement src/audio/positional-audio.ts to make these pass.
 *
 * API:
 *   type DistanceModel = 'linear' | 'inverse' | 'exponential';
 *
 *   interface PositionalAudioOptions {
 *     refDistance?: number;       // default 1
 *     maxDistance?: number;       // default 10000
 *     rolloffFactor?: number;    // default 1
 *     distanceModel?: DistanceModel; // default 'inverse'
 *   }
 *
 *   class PositionalAudio extends Node3D {
 *     readonly panner: PannerNode;
 *     readonly context: AudioContext;
 *
 *     constructor(listener: AudioListener, options?: PositionalAudioOptions);
 *
 *     play(clip: AudioClip): void;
 *     stop(): void;
 *
 *     setVolume(value: number): void;
 *     getVolume(): number;
 *     setLoop(value: boolean): void;
 *     getLoop(): boolean;
 *     isPlaying(): boolean;
 *
 *     setRefDistance(value: number): void;
 *     setMaxDistance(value: number): void;
 *     setRolloffFactor(value: number): void;
 *     setDistanceModel(model: DistanceModel): void;
 *
 *     /** Sync panner position with node world position. Call per frame. *\/
 *     updateMatrixWorld(): void;
 *
 *     dispose(): void;
 *   }
 *
 * Implementation notes:
 * - Extends Node3D — attach as child of the sound-emitting object
 * - constructor: creates PannerNode + GainNode, connects source → gain → panner → listener.getInput()
 * - play(clip): creates AudioBufferSourceNode, connects it, starts playback
 * - stop(): stops current source
 * - updateMatrixWorld: reads node worldMatrix column 3 for position,
 *   calls panner.setPosition(x,y,z) for WeChat compatibility
 * - PannerNode defaults: panningModel='HRTF', distanceModel='inverse',
 *   refDistance=1, maxDistance=10000, rolloffFactor=1
 * - dispose: stop + disconnect nodes
 *
 * Depends on:
 * - AudioListener (KR 1 of this Phase)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as listenerMod from '../../../src/audio/audio-listener';
import * as mod from '../../../src/audio/positional-audio';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const isListenerStub = '__STUB__' in listenerMod && (listenerMod as any).__STUB__ === true;
const describeImpl = (isStub || isListenerStub) ? describe.skip : describe;

const { PositionalAudio } = mod as any;
const { AudioListener } = listenerMod as any;

function createMockAudioContext() {
  const mockGainNode = {
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockPannerNode = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    setPosition: vi.fn(),
    setOrientation: vi.fn(),
    panningModel: 'HRTF' as string,
    distanceModel: 'inverse' as string,
    refDistance: 1,
    maxDistance: 10000,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 0,
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
  };

  const mockSourceNode = {
    buffer: null as any,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onended: null as any,
  };

  const mockBuffer = {
    duration: 2.0,
    length: 44100 * 2,
    numberOfChannels: 2,
    sampleRate: 44100,
    getChannelData: vi.fn(() => new Float32Array(44100)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  };

  const mockListener = {
    setPosition: vi.fn(),
    setOrientation: vi.fn(),
  };

  const mockContext = {
    state: 'running',
    destination: { maxChannelCount: 2 },
    listener: mockListener,
    createGain: vi.fn(() => ({ ...mockGainNode })),
    createPanner: vi.fn(() => ({ ...mockPannerNode })),
    createBufferSource: vi.fn(() => ({ ...mockSourceNode })),
    close: vi.fn(() => Promise.resolve()),
  };

  // @ts-expect-error — mock global
  globalThis.AudioContext = vi.fn(() => mockContext);

  return { mockContext, mockGainNode, mockPannerNode, mockSourceNode, mockBuffer };
}

function teardown() {
  // @ts-expect-error — cleanup
  delete globalThis.AudioContext;
}

/* ═══════════════════════════════════════════
   Construction
   ═══════════════════════════════════════════ */

describeImpl('PositionalAudio — construction', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should create a PannerNode', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    expect(audio.panner).toBeDefined();
    expect(mocks.mockContext.createPanner).toHaveBeenCalled();
  });

  it('should be a Node3D instance', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    expect(audio.position).toBeDefined();
    expect(audio.children).toBeDefined();
  });

  it('should not be playing initially', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    expect(audio.isPlaying()).toBe(false);
  });
});

/* ═══════════════════════════════════════════
   Distance Model Configuration
   ═══════════════════════════════════════════ */

describeImpl('PositionalAudio — distance model', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should apply custom options at construction', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener, {
      refDistance: 5,
      maxDistance: 500,
      rolloffFactor: 2,
      distanceModel: 'linear',
    });
    // Panner should have the custom values
    expect(audio.panner.refDistance).toBe(5);
    expect(audio.panner.maxDistance).toBe(500);
    expect(audio.panner.rolloffFactor).toBe(2);
    expect(audio.panner.distanceModel).toBe('linear');
  });

  it('should update distance model via setter', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    audio.setDistanceModel('exponential');
    expect(audio.panner.distanceModel).toBe('exponential');
  });

  it('should update ref distance via setter', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    audio.setRefDistance(10);
    expect(audio.panner.refDistance).toBe(10);
  });
});

/* ═══════════════════════════════════════════
   Play / Stop
   ═══════════════════════════════════════════ */

describeImpl('PositionalAudio — play / stop', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should start playback', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    const clip = { name: 'sfx', buffer: mocks.mockBuffer, duration: 2.0 };
    audio.play(clip);

    expect(audio.isPlaying()).toBe(true);
    expect(mocks.mockContext.createBufferSource).toHaveBeenCalled();
  });

  it('should stop playback', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    const clip = { name: 'sfx', buffer: mocks.mockBuffer, duration: 2.0 };
    audio.play(clip);
    audio.stop();

    expect(audio.isPlaying()).toBe(false);
  });

  it('stop without play should not throw', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    expect(() => audio.stop()).not.toThrow();
  });
});

/* ═══════════════════════════════════════════
   Volume & Loop
   ═══════════════════════════════════════════ */

describeImpl('PositionalAudio — volume & loop', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should default volume to 1', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    expect(audio.getVolume()).toBe(1);
  });

  it('should set volume', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    audio.setVolume(0.3);
    expect(audio.getVolume()).toBeCloseTo(0.3);
  });

  it('should default loop to false', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    expect(audio.getLoop()).toBe(false);
  });

  it('should set loop', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    audio.setLoop(true);
    expect(audio.getLoop()).toBe(true);
  });
});

/* ═══════════════════════════════════════════
   Position Sync
   ═══════════════════════════════════════════ */

describeImpl('PositionalAudio — updateMatrixWorld', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should sync panner position with node world position', () => {
    const listener = new AudioListener(mocks.mockContext);
    const audio = new PositionalAudio(listener);
    audio.position = vec3(10, 20, 30);
    audio.updateMatrixWorld();

    expect(audio.panner.setPosition).toHaveBeenCalledWith(10, 20, 30);
  });
});
