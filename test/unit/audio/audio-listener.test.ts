/**
 * Pre-written tests for AudioListener — 3D spatial audio listener.
 * AI must implement src/audio/audio-listener.ts to make these pass.
 *
 * API:
 *   class AudioListener extends Node3D {
 *     readonly context: AudioContext;
 *     readonly gain: GainNode;
 *
 *     constructor(context?: AudioContext);
 *
 *     setMasterVolume(value: number): void;
 *     getMasterVolume(): number;
 *
 *     /** Returns gain node for audio sources to connect to. *\/
 *     getInput(): GainNode;
 *
 *     /**
 *      * Sync Web Audio API listener position/orientation with this node's
 *      * world position and forward direction (-Z in local space).
 *      * Uses listener.setPosition() + listener.setOrientation() for max
 *      * compatibility (WeChat mini-game).
 *      * Call once per frame after scene graph update.
 *      *\/
 *     updateMatrixWorld(): void;
 *
 *     dispose(): void;
 *   }
 *
 * Implementation notes:
 * - Extends Node3D — typically added as child of camera
 * - constructor creates AudioContext (or accepts external one)
 * - gain: masterGain connected to context.destination
 * - updateMatrixWorld: reads this.worldMatrix to extract position (col 3)
 *   and forward direction (-col2 normalized), then calls
 *   context.listener.setPosition(x,y,z) and
 *   context.listener.setOrientation(fx,fy,fz, 0,1,0)
 * - dispose: disconnects gain, closes context
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as mod from '../../../src/audio/audio-listener';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { AudioListener } = mod as any;

function createMockAudioContext() {
  const mockGainNode = {
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockListener = {
    setPosition: vi.fn(),
    setOrientation: vi.fn(),
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    forwardX: { value: 0 },
    forwardY: { value: 0 },
    forwardZ: { value: -1 },
    upX: { value: 0 },
    upY: { value: 1 },
    upZ: { value: 0 },
  };

  const mockContext = {
    state: 'running' as string,
    destination: { maxChannelCount: 2 },
    listener: mockListener,
    createGain: vi.fn(() => ({ ...mockGainNode })),
    close: vi.fn(() => Promise.resolve()),
  };

  // @ts-expect-error — mock global
  globalThis.AudioContext = vi.fn(() => mockContext);

  return { mockContext, mockGainNode, mockListener };
}

function teardown() {
  // @ts-expect-error — cleanup
  delete globalThis.AudioContext;
}

/* ═══════════════════════════════════════════
   Construction
   ═══════════════════════════════════════════ */

describeImpl('AudioListener — construction', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should create an AudioContext when none provided', () => {
    const listener = new AudioListener();
    expect(listener.context).toBeDefined();
  });

  it('should accept an external AudioContext', () => {
    const listener = new AudioListener(mocks.mockContext);
    expect(listener.context).toBe(mocks.mockContext);
  });

  it('should have a gain node', () => {
    const listener = new AudioListener();
    expect(listener.gain).toBeDefined();
  });

  it('should be a Node3D instance', () => {
    const listener = new AudioListener();
    expect(listener.position).toBeDefined();
    expect(listener.children).toBeDefined();
  });
});

/* ═══════════════════════════════════════════
   Master Volume
   ═══════════════════════════════════════════ */

describeImpl('AudioListener — master volume', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should default master volume to 1', () => {
    const listener = new AudioListener();
    expect(listener.getMasterVolume()).toBe(1);
  });

  it('should set master volume', () => {
    const listener = new AudioListener();
    listener.setMasterVolume(0.5);
    expect(listener.getMasterVolume()).toBe(0.5);
  });

  it('should clamp volume to [0, 1]', () => {
    const listener = new AudioListener();
    listener.setMasterVolume(-0.5);
    expect(listener.getMasterVolume()).toBe(0);
    listener.setMasterVolume(2.0);
    expect(listener.getMasterVolume()).toBe(1);
  });
});

/* ═══════════════════════════════════════════
   getInput
   ═══════════════════════════════════════════ */

describeImpl('AudioListener — getInput', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should return the gain node', () => {
    const listener = new AudioListener();
    expect(listener.getInput()).toBe(listener.gain);
  });
});

/* ═══════════════════════════════════════════
   Position / Orientation Sync
   ═══════════════════════════════════════════ */

describeImpl('AudioListener — updateMatrixWorld', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should call listener.setPosition with node world position', () => {
    const listener = new AudioListener(mocks.mockContext);
    listener.position = vec3(3, 5, 7);
    listener.updateMatrixWorld();

    expect(mocks.mockListener.setPosition).toHaveBeenCalledWith(3, 5, 7);
  });

  it('should call listener.setOrientation with forward and up vectors', () => {
    const listener = new AudioListener(mocks.mockContext);
    listener.position = vec3(0, 0, 0);
    listener.updateMatrixWorld();

    // Default orientation: forward = (0,0,-1), up = (0,1,0)
    expect(mocks.mockListener.setOrientation).toHaveBeenCalled();
    const args = mocks.mockListener.setOrientation.mock.calls[0];
    // forward z should be -1 (looking down -Z)
    expect(args[2]).toBeCloseTo(-1);
    // up y should be 1
    expect(args[4]).toBeCloseTo(1);
  });
});

/* ═══════════════════════════════════════════
   Dispose
   ═══════════════════════════════════════════ */

describeImpl('AudioListener — dispose', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });
  afterEach(() => teardown());

  it('should close AudioContext on dispose', () => {
    const listener = new AudioListener(mocks.mockContext);
    listener.dispose();
    expect(mocks.mockContext.close).toHaveBeenCalled();
  });
});
