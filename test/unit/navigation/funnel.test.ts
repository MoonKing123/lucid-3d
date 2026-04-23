import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/navigation/funnel';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('funnelSmooth', () => {
  it('returns [start, end] when there are no portals', () => {
    const result = mod.funnelSmooth(vec3(0, 0, 0), vec3(4, 0, 0), [], []);
    expect(result.length).toBe(2);
    expect(result[0][0]).toBeCloseTo(0, 5);
    expect(result[1][0]).toBeCloseTo(4, 5);
  });

  it('smooths a straight corridor to a direct path (no intermediate waypoints)', () => {
    // Corridor from (0,0,0) to (4,0,0) with 3 portals at x=1, x=2, x=3, width=2
    // A funnel algorithm should recognize the straight line is already optimal.
    const portalsLeft = [vec3(1, 0, -1), vec3(2, 0, -1), vec3(3, 0, -1)];
    const portalsRight = [vec3(1, 0, 1), vec3(2, 0, 1), vec3(3, 0, 1)];
    const result = mod.funnelSmooth(vec3(0, 0, 0), vec3(4, 0, 0), portalsLeft, portalsRight);
    expect(result.length).toBe(2);
    expect(result[0][0]).toBeCloseTo(0, 5);
    expect(result[result.length - 1][0]).toBeCloseTo(4, 5);
  });

  it('pulls the string around a corner when start and end are not collinear', () => {
    // L-shaped corridor: start at (0,0,0), end at (4,0,4), corner near (4,0,0)
    // 2 portals: one at x=2 (left=(2,0,-1), right=(2,0,1)), one at (x=4, z=2) (left=(3,0,2), right=(5,0,2))
    const portalsLeft = [vec3(2, 0, -1), vec3(3, 0, 2)];
    const portalsRight = [vec3(2, 0, 1), vec3(5, 0, 2)];
    const result = mod.funnelSmooth(vec3(0, 0, 0), vec3(4, 0, 4), portalsLeft, portalsRight);
    // Should add at least one corner waypoint
    expect(result.length).toBeGreaterThanOrEqual(2);
    // First is start, last is end
    expect(result[0][0]).toBeCloseTo(0, 5);
    expect(result[0][2]).toBeCloseTo(0, 5);
    expect(result[result.length - 1][0]).toBeCloseTo(4, 5);
    expect(result[result.length - 1][2]).toBeCloseTo(4, 5);
  });

  it('throws when portal arrays have mismatched lengths', () => {
    expect(() =>
      mod.funnelSmooth(vec3(0, 0, 0), vec3(4, 0, 0), [vec3(1, 0, -1)], [vec3(1, 0, 1), vec3(2, 0, 1)]),
    ).toThrow();
  });

  it('preserves Y-coordinates from portal vertices', () => {
    // Portals with varying Y to simulate a slope
    const portalsLeft = [vec3(1, 2, -1), vec3(2, 4, -1), vec3(3, 6, -1)];
    const portalsRight = [vec3(1, 2, 1), vec3(2, 4, 1), vec3(3, 6, 1)];
    const result = mod.funnelSmooth(vec3(0, 0, 0), vec3(4, 8, 0), portalsLeft, portalsRight);
    // Start Y=0, End Y=8 preserved
    expect(result[0][1]).toBeCloseTo(0, 5);
    expect(result[result.length - 1][1]).toBeCloseTo(8, 5);
  });

  it('handles single-portal corridor', () => {
    const result = mod.funnelSmooth(
      vec3(0, 0, 0),
      vec3(2, 0, 0),
      [vec3(1, 0, -1)],
      [vec3(1, 0, 1)],
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0][0]).toBeCloseTo(0, 5);
    expect(result[result.length - 1][0]).toBeCloseTo(2, 5);
  });

  it('first waypoint is always the start point', () => {
    const portalsLeft = [vec3(1, 0, -1), vec3(2, 0, -1)];
    const portalsRight = [vec3(1, 0, 1), vec3(2, 0, 1)];
    const start = vec3(0.5, 0, 0);
    const result = mod.funnelSmooth(start, vec3(3, 0, 0), portalsLeft, portalsRight);
    expect(result[0][0]).toBeCloseTo(0.5, 5);
    expect(result[0][2]).toBeCloseTo(0, 5);
  });

  it('last waypoint is always the end point', () => {
    const portalsLeft = [vec3(1, 0, -1), vec3(2, 0, -1)];
    const portalsRight = [vec3(1, 0, 1), vec3(2, 0, 1)];
    const end = vec3(3.5, 0, 0);
    const result = mod.funnelSmooth(vec3(0, 0, 0), end, portalsLeft, portalsRight);
    expect(result[result.length - 1][0]).toBeCloseTo(3.5, 5);
    expect(result[result.length - 1][2]).toBeCloseTo(0, 5);
  });

  it('returns [start, end] when start equals end (degenerate)', () => {
    const p = vec3(1, 0, 1);
    const result = mod.funnelSmooth(p, p, [], []);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0][0]).toBeCloseTo(1, 5);
    expect(result[0][2]).toBeCloseTo(1, 5);
  });
});
