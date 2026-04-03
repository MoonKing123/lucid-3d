/**
 * NavGrid 2D 导航网格 — 预写测试
 * Phase 12: Navigation & Pathfinding (Architect)
 */
import { describe, it, expect } from 'vitest';
import * as mod from '../../../src/navigation/nav-grid';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { NavGrid } = mod;

describeImpl('NavGrid', () => {
  /* ---------- 构造与基础 ---------- */

  it('should create grid with correct dimensions', () => {
    const grid = new NavGrid(10, 8);
    expect(grid.width).toBe(10);
    expect(grid.height).toBe(8);
    expect(grid.cellSize).toBe(1);
  });

  it('should accept custom cellSize', () => {
    const grid = new NavGrid(5, 5, 2);
    expect(grid.cellSize).toBe(2);
  });

  it('should default all cells to walkable', () => {
    const grid = new NavGrid(4, 4);
    expect(grid.isWalkable(0, 0)).toBe(true);
    expect(grid.isWalkable(3, 3)).toBe(true);
    expect(grid.isWalkable(2, 1)).toBe(true);
  });

  /* ---------- Walkability ---------- */

  it('should set and get walkability', () => {
    const grid = new NavGrid(5, 5);
    grid.setWalkable(2, 3, false);
    expect(grid.isWalkable(2, 3)).toBe(false);
    expect(grid.isWalkable(2, 2)).toBe(true);
    grid.setWalkable(2, 3, true);
    expect(grid.isWalkable(2, 3)).toBe(true);
  });

  it('should return false for out-of-bounds walkability', () => {
    const grid = new NavGrid(5, 5);
    expect(grid.isWalkable(-1, 0)).toBe(false);
    expect(grid.isWalkable(5, 0)).toBe(false);
    expect(grid.isWalkable(0, -1)).toBe(false);
    expect(grid.isWalkable(0, 5)).toBe(false);
  });

  it('should check bounds correctly', () => {
    const grid = new NavGrid(3, 3);
    expect(grid.isInBounds(0, 0)).toBe(true);
    expect(grid.isInBounds(2, 2)).toBe(true);
    expect(grid.isInBounds(3, 0)).toBe(false);
    expect(grid.isInBounds(-1, 0)).toBe(false);
  });

  /* ---------- Cost ---------- */

  it('should default cost to 1', () => {
    const grid = new NavGrid(5, 5);
    expect(grid.getCost(0, 0)).toBe(1);
    expect(grid.getCost(4, 4)).toBe(1);
  });

  it('should set and get custom cost', () => {
    const grid = new NavGrid(5, 5);
    grid.setCost(1, 1, 3);
    expect(grid.getCost(1, 1)).toBe(3);
    expect(grid.getCost(0, 0)).toBe(1);
  });

  /* ---------- Coordinate conversion ---------- */

  it('should convert world to grid (cellSize=1)', () => {
    const grid = new NavGrid(10, 10, 1);
    expect(grid.worldToGrid(0.5, 0.5)).toEqual([0, 0]);
    expect(grid.worldToGrid(3.7, 5.2)).toEqual([3, 5]);
    expect(grid.worldToGrid(9.9, 9.9)).toEqual([9, 9]);
  });

  it('should convert world to grid (cellSize=2)', () => {
    const grid = new NavGrid(5, 5, 2);
    // cell 0 spans [0, 2), cell 1 spans [2, 4), etc.
    expect(grid.worldToGrid(1, 1)).toEqual([0, 0]);
    expect(grid.worldToGrid(3, 5)).toEqual([1, 2]);
    expect(grid.worldToGrid(9, 9)).toEqual([4, 4]);
  });

  it('should convert grid to world center', () => {
    const grid = new NavGrid(10, 10, 1);
    // Center of cell (0,0) with cellSize=1 is (0.5, 0.5)
    expect(grid.gridToWorld(0, 0)).toEqual([0.5, 0.5]);
    expect(grid.gridToWorld(3, 5)).toEqual([3.5, 5.5]);
  });

  it('should convert grid to world center (cellSize=2)', () => {
    const grid = new NavGrid(5, 5, 2);
    // Center of cell (0,0) with cellSize=2 is (1, 1)
    expect(grid.gridToWorld(0, 0)).toEqual([1, 1]);
    expect(grid.gridToWorld(2, 3)).toEqual([5, 7]);
  });

  /* ---------- Batch operations ---------- */

  it('should fill a rectangle as non-walkable', () => {
    const grid = new NavGrid(8, 8);
    grid.fillRect(2, 2, 3, 2, false);
    // Inside rect
    expect(grid.isWalkable(2, 2)).toBe(false);
    expect(grid.isWalkable(4, 3)).toBe(false);
    // Outside rect
    expect(grid.isWalkable(1, 2)).toBe(true);
    expect(grid.isWalkable(5, 2)).toBe(true);
    expect(grid.isWalkable(2, 4)).toBe(true);
  });

  /* ---------- Neighbors ---------- */

  it('should return 4 cardinal neighbors for interior cell', () => {
    const grid = new NavGrid(5, 5);
    const neighbors = grid.getNeighbors(2, 2, false);
    expect(neighbors).toHaveLength(4);
    expect(neighbors).toContainEqual([1, 2]);
    expect(neighbors).toContainEqual([3, 2]);
    expect(neighbors).toContainEqual([2, 1]);
    expect(neighbors).toContainEqual([2, 3]);
  });

  it('should return 8 neighbors with diagonal for interior cell', () => {
    const grid = new NavGrid(5, 5);
    const neighbors = grid.getNeighbors(2, 2, true);
    expect(neighbors).toHaveLength(8);
    // Cardinals
    expect(neighbors).toContainEqual([1, 2]);
    expect(neighbors).toContainEqual([3, 2]);
    // Diagonals
    expect(neighbors).toContainEqual([1, 1]);
    expect(neighbors).toContainEqual([3, 3]);
  });

  it('should filter out-of-bounds neighbors at corner', () => {
    const grid = new NavGrid(3, 3);
    const neighbors = grid.getNeighbors(0, 0, false);
    expect(neighbors).toHaveLength(2);
    expect(neighbors).toContainEqual([1, 0]);
    expect(neighbors).toContainEqual([0, 1]);
  });

  it('should filter non-walkable neighbors', () => {
    const grid = new NavGrid(5, 5);
    grid.setWalkable(3, 2, false);
    grid.setWalkable(2, 3, false);
    const neighbors = grid.getNeighbors(2, 2, false);
    // Only left (1,2) and up (2,1) are walkable
    expect(neighbors).toHaveLength(2);
    expect(neighbors).toContainEqual([1, 2]);
    expect(neighbors).toContainEqual([2, 1]);
  });

  /* ---------- Clear ---------- */

  it('should clear all cells to walkable with cost 1', () => {
    const grid = new NavGrid(4, 4);
    grid.setWalkable(1, 1, false);
    grid.setCost(2, 2, 5);
    grid.clear();
    expect(grid.isWalkable(1, 1)).toBe(true);
    expect(grid.getCost(2, 2)).toBe(1);
  });
});
