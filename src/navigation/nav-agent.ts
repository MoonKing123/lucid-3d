/**
 * NavAgent — path-following navigation agent.
 *
 * Attaches to a Node3D and moves it along a sequence of world-space waypoints.
 * Provides speed control, waypoint callbacks, and arrival detection.
 *
 * @see test/unit/navigation/nav-agent.test.ts
 */

export const __STUB__ = true;

import type { Node3D } from '../core/node3d';

export type AgentCallback = () => void;
export type WaypointCallback = (index: number) => void;

/** A navigation agent that moves a Node3D along a path of waypoints. */
export class NavAgent {
  speed: number;
  readonly node: Node3D;

  constructor(node: Node3D, speed: number = 5) {
    this.node = node;
    this.speed = speed;
  }

  get isMoving(): boolean { return false; }
  get currentWaypointIndex(): number { return -1; }

  /**
   * Set a path of world-space waypoints [x, z] for the agent to follow.
   * Replaces any existing path and starts moving immediately.
   */
  followPath(_waypoints: Array<[number, number]>): void {}

  /**
   * Update agent position. Call once per frame with delta time (seconds).
   */
  update(_dt: number): void {}

  /** Stop movement and clear the current path. */
  stop(): void {}

  /** Register callback for when the agent reaches the final waypoint. */
  onArrived(_callback: AgentCallback): void {}

  /** Register callback for each waypoint reached (including the last). */
  onWaypointReached(_callback: WaypointCallback): void {}
}
