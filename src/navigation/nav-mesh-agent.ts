/**
 * NavMeshAgent — 3D path-following agent for NavMesh waypoints.
 *
 * Attaches to a Node3D and moves it along a sequence of 3D waypoints (Vec3[]).
 * Unlike NavAgent (2D [x,z] waypoints), NavMeshAgent operates in full 3D space
 * with Y-axis awareness, enabling slopes, ramps, and multi-level navigation.
 *
 * API:
 *   - constructor(node: Node3D, speed?: number)
 *   - setPath(waypoints: Vec3[]): void — replace path and start moving from index 0
 *   - update(dt: number): void — advance position toward current waypoint
 *   - stop(): void — clear path, stop movement
 *   - onArrive(cb: () => void): void — called when final waypoint reached
 *   - onWaypoint(cb: (index: number) => void): void — called each time a waypoint is reached
 *   - get isMoving(): boolean
 *   - get currentWaypointIndex(): number
 *
 * @see test/unit/navigation/nav-mesh-agent.test.ts
 */

export const __STUB__ = true;

import type { Node3D } from '../core/node3d';
import type { Vec3 } from '../math/vec3';

export type AgentCallback = () => void;
export type WaypointCallback = (index: number) => void;

export class NavMeshAgent {
  speed: number;
  readonly node: Node3D;

  constructor(_node: Node3D, _speed: number = 5) {
    throw new Error('NavMeshAgent: Not implemented (stub)');
  }

  get isMoving(): boolean {
    throw new Error('NavMeshAgent.isMoving: Not implemented (stub)');
  }

  get currentWaypointIndex(): number {
    throw new Error('NavMeshAgent.currentWaypointIndex: Not implemented (stub)');
  }

  setPath(_waypoints: Vec3[]): void {
    throw new Error('NavMeshAgent.setPath: Not implemented (stub)');
  }

  update(_dt: number): void {
    throw new Error('NavMeshAgent.update: Not implemented (stub)');
  }

  stop(): void {
    throw new Error('NavMeshAgent.stop: Not implemented (stub)');
  }

  onArrive(_cb: AgentCallback): void {
    throw new Error('NavMeshAgent.onArrive: Not implemented (stub)');
  }

  onWaypoint(_cb: WaypointCallback): void {
    throw new Error('NavMeshAgent.onWaypoint: Not implemented (stub)');
  }
}
