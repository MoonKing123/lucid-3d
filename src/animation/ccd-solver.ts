/**
 * CCDSolver — Cyclic Coordinate Descent 多骨链 IK 求解器。
 * @see test/unit/animation/ccd-solver.test.ts
 */

import { type Vec3 } from '../math/vec3';
import { type Quat } from '../math/quat';

export const __STUB__ = true;

export interface CCDSolverInput {
  bonePositions: Vec3[];
  targetPos: Vec3;
  iterations?: number;
  tolerance?: number;
}

export interface CCDSolverResult {
  rotations: Quat[];
  converged: boolean;
  iterationsUsed: number;
}

export function solveCCD(_input: CCDSolverInput): CCDSolverResult {
  throw new Error('Not implemented');
}
