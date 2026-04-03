/**
 * Pre-written tests for AudioPool — SFX object pool for frequent one-shot sounds.
 * AI must implement src/audio/audio-pool.ts to make these pass.
 *
 * API:
 *   interface AudioPoolOptions {
 *     size?: number;            // default 8
 *     context: AudioContext;
 *     destination: AudioNode;   // typically listener.getInput()
 *   }
 *
 *   class AudioPool {
 *     readonly size: number;
 *
 *     constructor(options: AudioPoolOptions);
 *
 *     /** Play a one-shot SFX from the pool. Returns channel index (0..size-1)
 *      *  or -1 if pool exhausted. Volume defaults to 1. *\/
 *     play(clip: AudioClip, volume?: number): number;
 *
 *     /** Stop a specific channel by index. *\/
 *     stop(index: number): void;
 *
 *     /** Stop all active channels. *\/
 *     stopAll(): void;
 *
 *     /** Number of channels currently playing. *\/
 *     get activeCount(): number;
 *
 *     dispose(): void;
 *   }
 *
 * Implementation notes:
 * - Pre-allocates `size` GainNode instances connected to `destination`
 * - Each channel tracks: source (AudioBufferSourceNode | null), isActive
 * - play(): finds first inactive channel, creates BufferSource → channel gain → destination, starts it
 *   Sets source.onended to mark channel as inactive (auto-recycle)
 * - stop(i): calls source.stop(), marks channel inactive
 * - stopAll(): stops all active channels
 * - dispose(): stopAll + disconnect all gain nodes
 * - This avoids creating/connecting new nodes per shot — critical for gunshots, footsteps, etc.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as mod from '../../../src/audio/audio-pool';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { AudioPool } = mod as any;

function createMockAudioContext() {
  const mockGainNode = {
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockSourceNode = {
    buffer: null as any,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };

  const mockBuffer = {
    duration: 0.5,
    length: 44100 * 0.5,
    numberOfChannels: 1,
    sampleRate: 44100,
    getChannelData: vi.fn(() => new Float32Array(22050)),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  };

  const mockDestination = {
    maxChannelCount: 2,
  };

  const mockContext = {
    state: 'running',
    destination: mockDestination,
    createGain: vi.fn(() => ({ ...mockGainNode })),
    createBufferSource: vi.fn(() => {
      const src = { ...mockSourceNode, onended: null as any };
      return src;
    }),
    close: vi.fn(() => Promise.resolve()),
  };

  return { mockContext, mockGainNode, mockSourceNode, mockBuffer, mockDestination };
}

/* ═══════════════════════════════════════════
   Construction
   ═══════════════════════════════════════════ */

describeImpl('AudioPool — construction', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });

  it('should create pool with default size 8', () => {
    const pool = new AudioPool({
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    expect(pool.size).toBe(8);
  });

  it('should create pool with custom size', () => {
    const pool = new AudioPool({
      size: 4,
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    expect(pool.size).toBe(4);
  });

  it('should start with zero active channels', () => {
    const pool = new AudioPool({
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    expect(pool.activeCount).toBe(0);
  });
});

/* ═══════════════════════════════════════════
   Play
   ═══════════════════════════════════════════ */

describeImpl('AudioPool — play', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });

  it('should play a clip and return channel index >= 0', () => {
    const pool = new AudioPool({
      size: 4,
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    const clip = { name: 'shot', buffer: mocks.mockBuffer, duration: 0.5 };
    const idx = pool.play(clip);

    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(4);
    expect(pool.activeCount).toBe(1);
  });

  it('should play multiple clips on different channels', () => {
    const pool = new AudioPool({
      size: 4,
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    const clip = { name: 'shot', buffer: mocks.mockBuffer, duration: 0.5 };
    const idx1 = pool.play(clip);
    const idx2 = pool.play(clip);

    expect(idx1).not.toBe(idx2);
    expect(pool.activeCount).toBe(2);
  });

  it('should return -1 when pool is exhausted', () => {
    const pool = new AudioPool({
      size: 2,
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    const clip = { name: 'shot', buffer: mocks.mockBuffer, duration: 0.5 };
    pool.play(clip);
    pool.play(clip);
    const idx = pool.play(clip);

    expect(idx).toBe(-1);
    expect(pool.activeCount).toBe(2);
  });
});

/* ═══════════════════════════════════════════
   Stop
   ═══════════════════════════════════════════ */

describeImpl('AudioPool — stop', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });

  it('should stop a specific channel', () => {
    const pool = new AudioPool({
      size: 4,
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    const clip = { name: 'shot', buffer: mocks.mockBuffer, duration: 0.5 };
    const idx = pool.play(clip);
    pool.stop(idx);

    expect(pool.activeCount).toBe(0);
  });

  it('should not throw when stopping an inactive channel', () => {
    const pool = new AudioPool({
      size: 4,
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    expect(() => pool.stop(0)).not.toThrow();
  });

  it('stopAll should stop all active channels', () => {
    const pool = new AudioPool({
      size: 4,
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    const clip = { name: 'shot', buffer: mocks.mockBuffer, duration: 0.5 };
    pool.play(clip);
    pool.play(clip);
    pool.play(clip);
    expect(pool.activeCount).toBe(3);

    pool.stopAll();
    expect(pool.activeCount).toBe(0);
  });
});

/* ═══════════════════════════════════════════
   Auto-recycle (onended)
   ═══════════════════════════════════════════ */

describeImpl('AudioPool — auto-recycle', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });

  it('should recycle channel when source ends naturally', () => {
    const pool = new AudioPool({
      size: 2,
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    const clip = { name: 'shot', buffer: mocks.mockBuffer, duration: 0.5 };

    // Fill pool
    pool.play(clip);
    pool.play(clip);
    expect(pool.activeCount).toBe(2);

    // Simulate first source ending
    const firstSource = mocks.mockContext.createBufferSource.mock.results[0].value;
    if (firstSource.onended) firstSource.onended();

    expect(pool.activeCount).toBe(1);

    // Should be able to play again (recycled slot)
    const idx = pool.play(clip);
    expect(idx).toBeGreaterThanOrEqual(0);
  });
});

/* ═══════════════════════════════════════════
   Dispose
   ═══════════════════════════════════════════ */

describeImpl('AudioPool — dispose', () => {
  let mocks: ReturnType<typeof createMockAudioContext>;
  beforeEach(() => { mocks = createMockAudioContext(); });

  it('should stop all and allow no further plays', () => {
    const pool = new AudioPool({
      size: 4,
      context: mocks.mockContext,
      destination: mocks.mockDestination,
    });
    const clip = { name: 'shot', buffer: mocks.mockBuffer, duration: 0.5 };
    pool.play(clip);
    pool.dispose();

    expect(pool.activeCount).toBe(0);
  });
});
