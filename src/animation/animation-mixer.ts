/**
 * AnimationMixer — 动画播放引擎，驱动 Skeleton 按关键帧轨道更新。
 * 支持单片段播放和多 AnimationAction 权重混合。
 * @see test/unit/animation/animation-mixer.test.ts
 * @see test/unit/animation/animation-mixer-blending.test.ts
 */

import { Skeleton } from './skeleton';
import { AnimationClip } from './animation-clip';
import { AnimationAction } from './animation-action';

export class AnimationMixer {
  readonly skeleton: Skeleton;
  private _clip: AnimationClip | null = null;
  private _isPlaying: boolean = false;
  private _time: number = 0;
  private _loop: boolean = false;
  private _speed: number = 1;
  private _actions: AnimationAction[] = [];

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
  }

  /** 创建或复用与 clip 关联的 AnimationAction */
  clipAction(clip: AnimationClip): AnimationAction {
    let action = this._actions.find(a => a.clip === clip);
    if (!action) {
      action = new AnimationAction(clip, this.skeleton);
      this._actions.push(action);
    }
    return action;
  }

  play(clip: AnimationClip, options?: { loop?: boolean; speed?: number }): void {
    this._clip = clip;
    this._isPlaying = true;
    this._time = 0;
    this._loop = options?.loop ?? false;
    this._speed = options?.speed ?? 1;
  }

  stop(): void {
    this._isPlaying = false;
  }

  update(deltaTime: number): void {
    // 多 Action 混合模式
    if (this._actions.length > 0) {
      this._updateActions(deltaTime);
      return;
    }

    // 单片段兼容模式
    if (!this._isPlaying || !this._clip) return;

    this._time += deltaTime * this._speed;

    if (this._loop) {
      if (this._clip.duration > 0) {
        this._time = this._time % this._clip.duration;
      }
    } else {
      if (this._time >= this._clip.duration) {
        this._time = this._clip.duration;
        this._isPlaying = false;
      }
    }

    for (const track of this._clip.tracks) {
      const { targetPath, jointIndex } = track;
      if (targetPath === 'translation') {
        const out = new Float32Array(3);
        track.sample(this._time, out);
        this.skeleton.localPositions.set(out, jointIndex * 3);
      } else if (targetPath === 'rotation') {
        const out = new Float32Array(4);
        track.sample(this._time, out);
        this.skeleton.localRotations.set(out, jointIndex * 4);
      } else {
        const out = new Float32Array(3);
        track.sample(this._time, out);
        this.skeleton.localScales.set(out, jointIndex * 3);
      }
    }

    this.skeleton.update();
  }

  /** 推进所有 Action 并按权重混合写入骨骼 */
  private _updateActions(deltaTime: number): void {
    const n = this.skeleton.boneCount;
    const blendedPos = new Float32Array(n * 3);
    const blendedRot = new Float32Array(n * 4);
    const blendedScl = new Float32Array(n * 3);
    let totalWeight = 0;

    for (const action of this._actions) {
      action._update(deltaTime);
      const ew = action.effectiveWeight;
      if (ew <= 0) continue;

      const { positions, rotations, scales } = action._sample();
      for (let i = 0; i < n * 3; i++) blendedPos[i] += ew * positions[i];
      for (let i = 0; i < n * 4; i++) blendedRot[i] += ew * rotations[i];
      for (let i = 0; i < n * 3; i++) blendedScl[i] += ew * scales[i];
      totalWeight += ew;
    }

    if (totalWeight > 0) {
      for (let i = 0; i < n * 3; i++) this.skeleton.localPositions[i] = blendedPos[i] / totalWeight;
      for (let i = 0; i < n * 4; i++) this.skeleton.localRotations[i] = blendedRot[i] / totalWeight;
      for (let i = 0; i < n * 3; i++) this.skeleton.localScales[i] = blendedScl[i] / totalWeight;
    }

    this.skeleton.update();
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get time(): number {
    return this._time;
  }
}
