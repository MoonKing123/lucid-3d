import { describe, it, expect, vi } from 'vitest';
import * as mod from '../../../src/navigation/nav-mesh-agent';
import { Node3D } from '../../../src/core/node3d';
import { vec3 } from '../../../src/math/vec3';

const isStub = '__STUB__' in mod && (mod as any).__STUB__ === true;
const describeImpl = isStub ? describe.skip : describe;

describeImpl('NavMeshAgent', () => {
  it('constructs with node and default speed', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node);
    expect(agent.node).toBe(node);
    expect(agent.speed).toBe(5);
    expect(agent.isMoving).toBe(false);
  });

  it('accepts custom speed', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node, 10);
    expect(agent.speed).toBe(10);
  });

  it('setPath starts moving toward the first waypoint', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node);
    agent.setPath([vec3(10, 0, 0), vec3(10, 0, 10)]);
    expect(agent.isMoving).toBe(true);
    expect(agent.currentWaypointIndex).toBe(0);
  });

  it('setPath with empty waypoints keeps agent idle', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node);
    agent.setPath([]);
    expect(agent.isMoving).toBe(false);
  });

  it('update advances node toward waypoint in 3D space (XZ movement)', () => {
    const node = new Node3D();
    node.position[0] = 0; node.position[1] = 0; node.position[2] = 0;
    const agent = new mod.NavMeshAgent(node, 5);
    agent.setPath([vec3(10, 0, 0)]);
    agent.update(1); // 1 second at speed 5 → move 5 units
    expect(node.position[0]).toBeCloseTo(5, 3);
    expect(node.position[2]).toBeCloseTo(0, 3);
  });

  it('update respects Y-axis (3D movement with elevation change)', () => {
    const node = new Node3D();
    node.position[0] = 0; node.position[1] = 0; node.position[2] = 0;
    const agent = new mod.NavMeshAgent(node, 5);
    // Target 3-4-5 triangle: dist = 5, so 1 second at speed 5 should reach exactly
    agent.setPath([vec3(3, 4, 0)]);
    agent.update(1);
    // Should have moved exactly 5 units along the 3D line → arrived
    expect(node.position[0]).toBeCloseTo(3, 2);
    expect(node.position[1]).toBeCloseTo(4, 2);
    expect(node.position[2]).toBeCloseTo(0, 2);
  });

  it('advances to next waypoint when reaching current', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node, 10);
    agent.setPath([vec3(5, 0, 0), vec3(5, 0, 5)]);
    agent.update(1); // dist 5 at speed 10 → overshoots, advance to waypoint 1
    expect(agent.currentWaypointIndex).toBeGreaterThanOrEqual(1);
  });

  it('fires onWaypoint callback when reaching intermediate waypoint', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node, 100);
    const waypointCb = vi.fn();
    agent.onWaypoint(waypointCb);
    agent.setPath([vec3(1, 0, 0), vec3(2, 0, 0), vec3(3, 0, 0)]);
    agent.update(1);
    expect(waypointCb).toHaveBeenCalled();
  });

  it('fires onArrive callback when reaching final waypoint', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node, 100);
    const arriveCb = vi.fn();
    agent.onArrive(arriveCb);
    agent.setPath([vec3(1, 0, 0), vec3(2, 0, 0)]);
    agent.update(1); // speed 100, should overshoot both
    expect(arriveCb).toHaveBeenCalledTimes(1);
    expect(agent.isMoving).toBe(false);
  });

  it('stop() clears path and halts movement', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node);
    agent.setPath([vec3(10, 0, 0), vec3(20, 0, 0)]);
    expect(agent.isMoving).toBe(true);
    agent.stop();
    expect(agent.isMoving).toBe(false);
    expect(agent.currentWaypointIndex).toBe(-1);
  });

  it('update does nothing when not moving', () => {
    const node = new Node3D();
    node.position[0] = 0; node.position[1] = 0; node.position[2] = 0;
    const agent = new mod.NavMeshAgent(node, 5);
    agent.update(1);
    expect(node.position[0]).toBeCloseTo(0, 5);
    expect(node.position[1]).toBeCloseTo(0, 5);
    expect(node.position[2]).toBeCloseTo(0, 5);
  });

  it('setPath replaces existing path and resets to index 0', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node, 10);
    agent.setPath([vec3(5, 0, 0), vec3(5, 0, 5)]);
    agent.update(0.5); // partial progress
    agent.setPath([vec3(-5, 0, 0)]);
    expect(agent.currentWaypointIndex).toBe(0);
    expect(agent.isMoving).toBe(true);
  });

  it('onArrive only fires once per path', () => {
    const node = new Node3D();
    const agent = new mod.NavMeshAgent(node, 100);
    const arriveCb = vi.fn();
    agent.onArrive(arriveCb);
    agent.setPath([vec3(1, 0, 0)]);
    agent.update(1);
    agent.update(1);
    agent.update(1);
    expect(arriveCb).toHaveBeenCalledTimes(1);
  });
});
