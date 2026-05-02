/**
 * TwoBoneIKSolver — 解析两骨 IK 求解器（人形手臂/腿）。
 * @see test/unit/animation/two-bone-ik.test.ts
 */

import { type Vec3 } from '../math/vec3';
import { type Quat } from '../math/quat';

export const __STUB__ = true;

export interface TwoBoneIKResult {
  rootRotation: Quat;
  midRotation: Quat;
}

export interface TwoBoneIKInput {
  rootPos: Vec3;
  midPos: Vec3;
  endPos: Vec3;
  targetPos: Vec3;
  poleVector?: Vec3;
}

export function solveTwoBoneIK(_input: TwoBoneIKInput): TwoBoneIKResult {
  throw new Error('Not implemented');
}
