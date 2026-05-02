/**
 * IKChain — Skeleton 集成层，把 IK 求解结果应用到 bone hierarchy。
 * @see test/unit/animation/ik-chain.test.ts
 */

import { type Vec3 } from '../math/vec3';
import { type Skeleton } from './skeleton';

export const __STUB__ = true;

export type IKSolverType = 'two-bone' | 'ccd';

export interface IKChainOptions {
  solver: IKSolverType;
  boneIndices: number[];
  target: Vec3;
  iterations?: number;
  tolerance?: number;
  weight?: number;
}

export class IKChain {
  constructor(_options: IKChainOptions) {
    throw new Error('Not implemented');
  }

  setTarget(_target: Vec3): void {
    throw new Error('Not implemented');
  }

  solve(_skeleton: Skeleton): boolean {
    throw new Error('Not implemented');
  }
}
