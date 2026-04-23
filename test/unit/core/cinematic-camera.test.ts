/**
 * CinematicCamera — pre-written tests (Architect)
 * Validates: construction, play/pause/stop, seek, linear interpolation,
 *            duration, onStart/onEnd callbacks, param validation.
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/core/cinematic-camera';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const basicKeyframes = [
  { time: 0,   position: [0, 0, 10] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] },
  { time: 1,   position: [10, 0, 0] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] },
  { time: 2,   position: [0, 0, -10] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] },
];

describeImpl('CinematicCamera', () => {
  it('should construct with keyframes and default options', () => {
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes });
    expect(cam).toBeInstanceOf(mod.CinematicCamera);
    expect(cam.duration).toBe(2);
    expect(cam.currentTime).toBe(0);
    expect(cam.isPlaying).toBe(false);
    expect(cam.isFinished).toBe(false);
  });

  it('play() should start playback, isPlaying true', () => {
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes });
    cam.play();
    expect(cam.isPlaying).toBe(true);
  });

  it('pause() should halt playback, isPlaying false', () => {
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes });
    cam.play();
    cam.pause();
    expect(cam.isPlaying).toBe(false);
  });

  it('stop() should reset to time=0 and stop playback', () => {
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes });
    cam.play();
    cam.update(0.5);
    cam.stop();
    expect(cam.isPlaying).toBe(false);
    expect(cam.currentTime).toBe(0);
  });

  it('seek(t) should jump to specified time, clamped to [0, duration]', () => {
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes });
    cam.seek(1.5);
    expect(cam.currentTime).toBe(1.5);
    cam.seek(-1);
    expect(cam.currentTime).toBe(0);
    cam.seek(5);
    expect(cam.currentTime).toBe(cam.duration);
  });

  it('linear interpolation should give midpoint at t=0.5 between keyframes', () => {
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes, interpolation: 'linear' });
    cam.seek(0.5);
    expect(cam.position[0]).toBeCloseTo(5, 3);
    expect(cam.position[2]).toBeCloseTo(5, 3);
  });

  it('update(dt) should advance currentTime when playing', () => {
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes });
    cam.play();
    cam.update(0.5);
    expect(cam.currentTime).toBeCloseTo(0.5, 3);
  });

  it('update(dt) should not advance when paused', () => {
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes });
    cam.update(0.5);
    expect(cam.currentTime).toBe(0);
  });

  it('should trigger onStart on first play and onEnd when finished', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes });
    cam.onStart = onStart;
    cam.onEnd = onEnd;
    cam.play();
    expect(onStart).toHaveBeenCalledTimes(1);
    cam.update(3.0);
    expect(cam.isFinished).toBe(true);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('loop=true should restart after duration without triggering isFinished', () => {
    const cam = new mod.CinematicCamera({ keyframes: basicKeyframes, loop: true });
    cam.play();
    cam.update(2.5);
    expect(cam.isFinished).toBe(false);
    expect(cam.currentTime).toBeLessThan(cam.duration);
  });

  it('should throw on empty keyframes', () => {
    expect(() => new mod.CinematicCamera({ keyframes: [] })).toThrow();
  });

  it('should throw on non-monotonic keyframe time', () => {
    const bad = [
      { time: 0, position: [0, 0, 0] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] },
      { time: 2, position: [0, 0, 0] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] },
      { time: 1, position: [0, 0, 0] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] },
    ];
    expect(() => new mod.CinematicCamera({ keyframes: bad })).toThrow();
  });
});
