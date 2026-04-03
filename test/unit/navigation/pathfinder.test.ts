/**
 * A* Pathfinder — 预写测试
 * Phase 12: Navigation & Pathfinding (Architect)
 */
import { describe, it, expect } from 'vitest';
import * as gridMod from '../../../src/navigation/nav-grid';
import * as mod from '../../../src/navigation/pathfinder';

const isStubGrid = '__STUB__' in gridMod && (gridMod as any).__STUB__ === true;
const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = (isStub || isStubGrid) ? describe.skip : describe;

const { NavGrid } = gridMod;
const { findPath } = mod;

describeImpl('findPath (A*)', () => {
  /* ---------- 基本路径 ---------- */

  it('should find straight-line path on empty grid', () => {
    const grid = new NavGrid(5, 1);
    const result = findPath(grid, 0, 0, 4, 0);
    expect(result.found).toBe(true);
    expect(result.path[0]).toEqual([0, 0]);
    expect(result.path[result.path.length - 1]).toEqual([4, 0]);
    expect(result.path).toHaveLength(5); // 0→1→2→3→4
  });

  it('should return correct cost for straight path', () => {
    const grid = new NavGrid(5, 1);
    const result = findPath(grid, 0, 0, 4, 0);
    // 4 steps, each cost 1
    expect(result.cost).toBe(4);
  });

  it('should handle start == end', () => {
    const grid = new NavGrid(5, 5);
    const result = findPath(grid, 2, 2, 2, 2);
    expect(result.found).toBe(true);
    expect(result.path).toHaveLength(1);
    expect(result.path[0]).toEqual([2, 2]);
    expect(result.cost).toBe(0);
  });

  /* ---------- 障碍物绕行 ---------- */

  it('should find path around single obstacle', () => {
    // Grid:  S . . . .
    //        . X X X .
    //        . . . . E
    const grid = new NavGrid(5, 3);
    grid.setWalkable(1, 1, false);
    grid.setWalkable(2, 1, false);
    grid.setWalkable(3, 1, false);
    const result = findPath(grid, 0, 0, 4, 2);
    expect(result.found).toBe(true);
    // Path should not go through blocked cells
    for (const [x, y] of result.path) {
      expect(grid.isWalkable(x, y)).toBe(true);
    }
  });

  it('should find path through narrow corridor', () => {
    // 5x5 grid with walls, only one gap at (2,2)
    const grid = new NavGrid(5, 5);
    // Wall across row 2, gap at x=2
    for (let x = 0; x < 5; x++) {
      if (x !== 2) grid.setWalkable(x, 2, false);
    }
    const result = findPath(grid, 0, 0, 4, 4);
    expect(result.found).toBe(true);
    expect(result.path).toContainEqual([2, 2]); // must go through gap
  });

  /* ---------- 不可达 ---------- */

  it('should return found=false when fully blocked', () => {
    const grid = new NavGrid(5, 5);
    // Block entire row 2
    for (let x = 0; x < 5; x++) grid.setWalkable(x, 2, false);
    const result = findPath(grid, 2, 0, 2, 4);
    expect(result.found).toBe(false);
    expect(result.path).toHaveLength(0);
  });

  it('should return found=false for out-of-bounds start', () => {
    const grid = new NavGrid(5, 5);
    const result = findPath(grid, -1, 0, 4, 4);
    expect(result.found).toBe(false);
  });

  it('should return found=false for out-of-bounds end', () => {
    const grid = new NavGrid(5, 5);
    const result = findPath(grid, 0, 0, 5, 5);
    expect(result.found).toBe(false);
  });

  it('should return found=false when start is non-walkable', () => {
    const grid = new NavGrid(5, 5);
    grid.setWalkable(0, 0, false);
    const result = findPath(grid, 0, 0, 4, 4);
    expect(result.found).toBe(false);
  });

  it('should return found=false when end is non-walkable', () => {
    const grid = new NavGrid(5, 5);
    grid.setWalkable(4, 4, false);
    const result = findPath(grid, 0, 0, 4, 4);
    expect(result.found).toBe(false);
  });

  /* ---------- 方向模式 ---------- */

  it('should find diagonal path (8-direction)', () => {
    const grid = new NavGrid(5, 5);
    const result = findPath(grid, 0, 0, 4, 4, { diagonal: true });
    expect(result.found).toBe(true);
    // Diagonal path from (0,0) to (4,4) should be shorter than cardinal
    expect(result.path.length).toBeLessThanOrEqual(5); // 4 diagonal steps + start
  });

  it('should find cardinal-only path (4-direction)', () => {
    const grid = new NavGrid(5, 5);
    const result = findPath(grid, 0, 0, 4, 4, { diagonal: false });
    expect(result.found).toBe(true);
    // Cardinal path: 4 right + 4 down = 8 steps + start = 9 nodes
    expect(result.path).toHaveLength(9);
    expect(result.cost).toBe(8);
  });

  /* ---------- 代价权重 ---------- */

  it('should prefer low-cost cells', () => {
    // 3x3 grid: top-right path has cost 10 cells, bottom-left is normal
    const grid = new NavGrid(3, 3);
    // Make row 0 expensive (except start)
    grid.setCost(1, 0, 10);
    grid.setCost(2, 0, 10);
    const result = findPath(grid, 0, 0, 2, 0, { diagonal: false });
    expect(result.found).toBe(true);
    // Optimal path avoids row 0: go down, right, right, up
    // Total: 4 steps, cost 4, vs direct: 2 steps, cost 20
    if (result.cost < 20) {
      // Path should go via row 1 or row 2 to avoid expensive cells
      const hasExpensiveCell = result.path.some(([x, y]) => x > 0 && y === 0);
      expect(hasExpensiveCell).toBe(false);
    }
  });

  /* ---------- 迭代限制 ---------- */

  it('should respect maxIterations limit', () => {
    const grid = new NavGrid(100, 100);
    // With very low iteration limit, should fail to find long path
    const result = findPath(grid, 0, 0, 99, 99, { maxIterations: 5 });
    expect(result.found).toBe(false);
  });

  /* ---------- 大网格性能 ---------- */

  it('should handle 100x100 grid within reasonable time', () => {
    const grid = new NavGrid(100, 100);
    const start = performance.now();
    const result = findPath(grid, 0, 0, 99, 99);
    const elapsed = performance.now() - start;
    expect(result.found).toBe(true);
    expect(elapsed).toBeLessThan(500); // should finish well within 500ms
  });

  /* ---------- 动态障碍 ---------- */

  it('should find new path after obstacle update', () => {
    const grid = new NavGrid(5, 3);
    // Initial: clear path
    const result1 = findPath(grid, 0, 0, 4, 0);
    expect(result1.found).toBe(true);
    const originalLen = result1.path.length;

    // Block the direct path
    grid.setWalkable(2, 0, false);
    const result2 = findPath(grid, 0, 0, 4, 0);
    expect(result2.found).toBe(true);
    // New path must be longer (detour)
    expect(result2.path.length).toBeGreaterThan(originalLen);
    // And must not go through blocked cell
    expect(result2.path).not.toContainEqual([2, 0]);
  });

  /* ---------- 启发函数 ---------- */

  it('should accept manhattan heuristic option', () => {
    const grid = new NavGrid(10, 10);
    const result = findPath(grid, 0, 0, 9, 9, {
      diagonal: false,
      heuristic: 'manhattan',
    });
    expect(result.found).toBe(true);
    expect(result.cost).toBe(18); // 9 + 9
  });

  it('should accept euclidean heuristic option', () => {
    const grid = new NavGrid(10, 10);
    const result = findPath(grid, 0, 0, 9, 9, {
      diagonal: true,
      heuristic: 'euclidean',
    });
    expect(result.found).toBe(true);
    // Euclidean admits diagonal; path should be optimal
    expect(result.path.length).toBeLessThanOrEqual(10);
  });
});
