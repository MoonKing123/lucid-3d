/**
 * NavMeshAgent — 3D path-following agent for NavMesh waypoints.
 *
 * Attaches to a Node3D and moves it along a sequence of 3D waypoints (Vec3[]).
 * Unlike NavAgent (2D [x,z] waypoints), NavMeshAgent operates in full 3D space
 * with Y-axis awareness, enabling slopes, ramps, and multi-level navigation.
 *
 * @see test/unit/navigation/nav-mesh-agent.test.ts
 */

import type { Node3D } from '../core/node3d';
import type { Vec3 } from '../math/vec3';

export type AgentCallback = () => void;
export type WaypointCallback = (index: number) => void;

export class NavMeshAgent {
  speed: number;
  readonly node: Node3D;

  private _waypoints: Vec3[] = [];
  private _currentIndex: number = -1;
  private _arrivedCallback: AgentCallback | null = null;
  private _waypointCallback: WaypointCallback | null = null;
  private _arrivedFired: boolean = false;

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

  setPath(waypoints: Vec3[]): void {
    this._arrivedFired = false;
    if (waypoints.length === 0) {
      this._waypoints = [];
      this._currentIndex = -1;
      return;
    }
    this._waypoints = waypoints;
    this._currentIndex = 0;
  }

  update(dt: number): void {
    if (!this.isMoving) return;

    let remaining = this.speed * dt;

    while (remaining > 0 && this.isMoving) {
      const wp = this._waypoints[this._currentIndex];
      const dx = wp[0] - this.node.position[0];
      const dy = wp[1] - this.node.position[1];
      const dz = wp[2] - this.node.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < remaining) {
        // 到达：snap 到 waypoint 精确位置，用剩余预算继续
        this.node.position[0] = wp[0];
        this.node.position[1] = wp[1];
        this.node.position[2] = wp[2];
        remaining -= dist;

        const reachedIndex = this._currentIndex;
        this._waypointCallback?.(reachedIndex);

        if (this._currentIndex === this._waypoints.length - 1) {
          this._currentIndex = -1;
          if (!this._arrivedFired) {
            this._arrivedFired = true;
            this._arrivedCallback?.();
          }
          break;
        } else {
          this._currentIndex++;
        }
      } else {
        // 本帧预算不足以到达，移动剩余距离
        this.node.position[0] += (dx / dist) * remaining;
        this.node.position[1] += (dy / dist) * remaining;
        this.node.position[2] += (dz / dist) * remaining;
        break;
      }
    }
  }

  stop(): void {
    this._waypoints = [];
    this._currentIndex = -1;
    this._arrivedFired = false;
  }

  onArrive(cb: AgentCallback): void {
    this._arrivedCallback = cb;
  }

  onWaypoint(cb: WaypointCallback): void {
    this._waypointCallback = cb;
  }
}
