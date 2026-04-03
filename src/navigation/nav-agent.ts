/**
 * NavAgent — path-following navigation agent.
 *
 * Attaches to a Node3D and moves it along a sequence of world-space waypoints.
 * Provides speed control, waypoint callbacks, and arrival detection.
 *
 * @see test/unit/navigation/nav-agent.test.ts
 */

import type { Node3D } from '../core/node3d';

export type AgentCallback = () => void;
export type WaypointCallback = (index: number) => void;

/** A navigation agent that moves a Node3D along a path of waypoints. */
export class NavAgent {
  speed: number;
  readonly node: Node3D;

  private _waypoints: Array<[number, number]> = [];
  private _currentIndex: number = -1;
  private _arrivedCallback: AgentCallback | null = null;
  private _waypointCallback: WaypointCallback | null = null;

  constructor(node: Node3D, speed: number = 5) {
    this.node = node;
    this.speed = speed;
  }

  get isMoving(): boolean {
    return this._currentIndex >= 0 && this._currentIndex < this._waypoints.length;
  }

  get currentWaypointIndex(): number {
    return this._currentIndex;
  }

  /**
   * Set a path of world-space waypoints [x, z] for the agent to follow.
   * Replaces any existing path and starts moving immediately.
   * Empty path triggers onArrived immediately.
   */
  followPath(waypoints: Array<[number, number]>): void {
    if (waypoints.length === 0) {
      this._waypoints = [];
      this._currentIndex = -1;
      this._arrivedCallback?.();
      return;
    }
    this._waypoints = waypoints;
    this._currentIndex = 0;
  }

  /**
   * Update agent position. Call once per frame with delta time (seconds).
   * Only modifies X and Z; Y is left unchanged.
   */
  update(dt: number): void {
    if (!this.isMoving) return;

    const [wx, wz] = this._waypoints[this._currentIndex];
    const px = this.node.position[0];
    const pz = this.node.position[2];

    const dx = wx - px;
    const dz = wz - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const step = this.speed * dt;

    if (dist <= step) {
      // 精确到达：snap 到 waypoint 位置
      this.node.position[0] = wx;
      this.node.position[2] = wz;

      const reachedIndex = this._currentIndex;
      this._waypointCallback?.(reachedIndex);

      if (this._currentIndex === this._waypoints.length - 1) {
        // 最终 waypoint 到达
        this._currentIndex = -1;
        this._arrivedCallback?.();
      } else {
        this._currentIndex++;
      }
    } else {
      // 向当前 waypoint 方向移动
      this.node.position[0] += (dx / dist) * step;
      this.node.position[2] += (dz / dist) * step;
    }
  }

  /** Stop movement and clear the current path. */
  stop(): void {
    this._currentIndex = -1;
    this._waypoints = [];
  }

  /** Register callback for when the agent reaches the final waypoint. */
  onArrived(callback: AgentCallback): void {
    this._arrivedCallback = callback;
  }

  /** Register callback for each waypoint reached (including the last). */
  onWaypointReached(callback: WaypointCallback): void {
    this._waypointCallback = callback;
  }
}
