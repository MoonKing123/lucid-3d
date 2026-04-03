/**
 * NavAgent 导航代理 — 预写测试
 * Phase 12: Navigation & Pathfinding (Architect)
 */
import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/navigation/nav-agent';
import { Node3D } from '../../../src/core/node3d';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

const { NavAgent } = mod;

describeImpl('NavAgent', () => {
  function makeNode(x = 0, z = 0): Node3D {
    const node = new Node3D();
    node.position[0] = x;
    node.position[2] = z;
    return node;
  }

  /* ---------- 构造 ---------- */

  it('should create agent with node and default speed', () => {
    const node = makeNode();
    const agent = new NavAgent(node);
    expect(agent.node).toBe(node);
    expect(agent.speed).toBe(5);
  });

  it('should accept custom speed', () => {
    const agent = new NavAgent(makeNode(), 10);
    expect(agent.speed).toBe(10);
  });

  it('should not be moving initially', () => {
    const agent = new NavAgent(makeNode());
    expect(agent.isMoving).toBe(false);
    expect(agent.currentWaypointIndex).toBe(-1);
  });

  /* ---------- 路径跟随 ---------- */

  it('should start moving after followPath', () => {
    const agent = new NavAgent(makeNode(), 10);
    agent.followPath([[5, 0], [10, 0]]);
    expect(agent.isMoving).toBe(true);
    expect(agent.currentWaypointIndex).toBe(0);
  });

  it('should move node position toward first waypoint', () => {
    const node = makeNode(0, 0);
    const agent = new NavAgent(node, 10);
    agent.followPath([[10, 0]]);
    // Move for 0.5 seconds at speed 10 → should advance 5 units in X
    agent.update(0.5);
    expect(node.position[0]).toBeCloseTo(5, 1);
    expect(node.position[2]).toBeCloseTo(0, 1);
  });

  it('should reach waypoint and advance to next', () => {
    const node = makeNode(0, 0);
    const agent = new NavAgent(node, 10);
    const wpCb = vi.fn();
    agent.onWaypointReached(wpCb);
    agent.followPath([[5, 0], [5, 10]]);
    // Move enough to reach first waypoint
    agent.update(0.5); // 5 units at speed 10
    expect(wpCb).toHaveBeenCalledWith(0);
    expect(agent.currentWaypointIndex).toBe(1);
  });

  it('should stop and fire onArrived after reaching final waypoint', () => {
    const node = makeNode(0, 0);
    const agent = new NavAgent(node, 100); // fast speed
    const arrivedCb = vi.fn();
    agent.onArrived(arrivedCb);
    agent.followPath([[5, 0]]);
    agent.update(1); // 100 units in 1s, waypoint at 5 → should arrive
    expect(arrivedCb).toHaveBeenCalledTimes(1);
    expect(agent.isMoving).toBe(false);
  });

  it('should set node final position to exact waypoint', () => {
    const node = makeNode(0, 0);
    const agent = new NavAgent(node, 100);
    agent.followPath([[5, 3]]);
    agent.update(1); // overshoots
    expect(node.position[0]).toBeCloseTo(5, 5);
    expect(node.position[2]).toBeCloseTo(3, 5);
  });

  /* ---------- 停止 ---------- */

  it('should stop movement on stop()', () => {
    const node = makeNode(0, 0);
    const agent = new NavAgent(node, 10);
    agent.followPath([[100, 0]]);
    agent.update(0.5);
    const posX = node.position[0];
    agent.stop();
    expect(agent.isMoving).toBe(false);
    agent.update(0.5);
    // Position should not change after stop
    expect(node.position[0]).toBeCloseTo(posX, 5);
  });

  /* ---------- 速度 ---------- */

  it('should respect speed setting', () => {
    const node1 = makeNode(0, 0);
    const node2 = makeNode(0, 0);
    const fast = new NavAgent(node1, 20);
    const slow = new NavAgent(node2, 5);
    fast.followPath([[100, 0]]);
    slow.followPath([[100, 0]]);
    fast.update(1);
    slow.update(1);
    expect(node1.position[0]).toBeCloseTo(20, 1);
    expect(node2.position[0]).toBeCloseTo(5, 1);
  });

  /* ---------- 路径替换 ---------- */

  it('should replace path when followPath is called again', () => {
    const node = makeNode(0, 0);
    const agent = new NavAgent(node, 10);
    agent.followPath([[100, 0]]);
    agent.update(0.5); // move to x=5
    // Replace with new path going in Z direction
    agent.followPath([[5, 100]]);
    expect(agent.currentWaypointIndex).toBe(0);
    expect(agent.isMoving).toBe(true);
    agent.update(0.5); // should move in Z now
    expect(node.position[2]).toBeGreaterThan(0);
  });

  /* ---------- 空路径 ---------- */

  it('should fire onArrived immediately for empty path', () => {
    const agent = new NavAgent(makeNode());
    const arrivedCb = vi.fn();
    agent.onArrived(arrivedCb);
    agent.followPath([]);
    expect(arrivedCb).toHaveBeenCalledTimes(1);
    expect(agent.isMoving).toBe(false);
  });

  /* ---------- Node3D Y 轴不受影响 ---------- */

  it('should only update X and Z, leaving Y unchanged', () => {
    const node = makeNode(0, 0);
    node.position[1] = 5; // Y = 5
    const agent = new NavAgent(node, 10);
    agent.followPath([[10, 10]]);
    agent.update(0.5);
    expect(node.position[1]).toBe(5); // Y unchanged
  });
});
