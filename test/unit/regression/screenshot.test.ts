import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scheduleScreenshots, parseDemoName, parseMoments, generateOutputPath } from '../../../scripts/regression-screenshot';

describe('regression-screenshot', () => {
  describe('parseMoments', () => {
    it('default moments = [0, 5, 15, 30]', () => {
      expect(parseMoments(undefined)).toEqual([0, 5000, 15000, 30000]);
    });

    it('parses custom moments string', () => {
      expect(parseMoments('0s,2s,10s')).toEqual([0, 2000, 10000]);
    });

    it('throws on invalid format', () => {
      expect(() => parseMoments('abc')).toThrow();
    });
  });

  describe('parseDemoName', () => {
    it('accepts valid demo names', () => {
      expect(parseDemoName('runner-3d')).toBe('runner-3d');
      expect(parseDemoName('all')).toBe('all');
    });

    it('throws on unknown demo', () => {
      expect(() => parseDemoName('foo')).toThrow();
    });
  });

  describe('generateOutputPath', () => {
    it('returns docs/regression/phase-<n>/<demo>/<moment>s.png', () => {
      expect(generateOutputPath({ phase: 50, demo: 'runner-3d', moment: 5000 }))
        .toBe('docs/regression/phase-50/runner-3d/5s.png');
    });

    it('respects --out override', () => {
      expect(generateOutputPath({ phase: 50, demo: 'runner-3d', moment: 5000, out: '/tmp/foo' }))
        .toBe('/tmp/foo/5s.png');
    });
  });

  describe('scheduleScreenshots', () => {
    it('schedules screenshots at given moments', async () => {
      vi.useFakeTimers();
      const mockPage = { screenshot: vi.fn().mockResolvedValue(undefined) };
      const promise = scheduleScreenshots(mockPage as any, [0, 5000, 15000, 30000], { phase: 50, demo: 'test', out: '/tmp' });

      await vi.advanceTimersByTimeAsync(0);
      expect(mockPage.screenshot).toHaveBeenCalledTimes(1);
      expect(mockPage.screenshot).toHaveBeenLastCalledWith({ path: '/tmp/0s.png', fullPage: false });

      await vi.advanceTimersByTimeAsync(5000);
      expect(mockPage.screenshot).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(10000); // total 15s
      expect(mockPage.screenshot).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(15000); // total 30s
      expect(mockPage.screenshot).toHaveBeenCalledTimes(4);

      await promise;
      vi.useRealTimers();
    });
  });
});
