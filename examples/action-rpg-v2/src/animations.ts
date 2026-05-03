import { Skeleton, type BoneData } from '../../../src/animation/skeleton';
import { AnimationClip } from '../../../src/animation/animation-clip';
import { KeyframeTrack } from '../../../src/animation/keyframe-track';

// 11 骨骼层次：躯干 + 双腿(TwoBoneIK) + 左臂(IKChain 手抓弓)
//
// 索引   名称       父索引
//  0     root       -1      骨盆
//  1     spine       0      脊柱
//  2     l_thigh     0      左大腿 ← TwoBoneIK 左腿 root
//  3     l_shin      2      左小腿 ← TwoBoneIK 左腿 mid
//  4     l_foot      3      左脚   ← TwoBoneIK 左腿 end
//  5     r_thigh     0      右大腿 ← TwoBoneIK 右腿 root
//  6     r_shin      5      右小腿 ← TwoBoneIK 右腿 mid
//  7     r_foot      6      右脚   ← TwoBoneIK 右腿 end
//  8     l_upper     1      左上臂 ← IKChain 手抓弓 root
//  9     l_lower     8      左前臂 ← IKChain 手抓弓 mid
// 10     l_hand      9      左手   ← IKChain 手抓弓 end
const BONES: BoneData[] = [
  { name: 'root',    parentIndex: -1 },  // 0
  { name: 'spine',   parentIndex: 0  },  // 1
  { name: 'l_thigh', parentIndex: 0  },  // 2
  { name: 'l_shin',  parentIndex: 2  },  // 3
  { name: 'l_foot',  parentIndex: 3  },  // 4
  { name: 'r_thigh', parentIndex: 0  },  // 5
  { name: 'r_shin',  parentIndex: 5  },  // 6
  { name: 'r_foot',  parentIndex: 6  },  // 7
  { name: 'l_upper', parentIndex: 1  },  // 8
  { name: 'l_lower', parentIndex: 8  },  // 9
  { name: 'l_hand',  parentIndex: 9  },  // 10
];

// 骨骼局部位置偏移（相对父骨骼，单位 m）
// 玩家站立时脚底大约在 skeleton 局部空间 y ≈ -1.28
const BONE_LOCAL_POS: Array<[number, number, number]> = [
  [ 0,     0,    0   ],  // 0 root
  [ 0,     0.5,  0   ],  // 1 spine
  [-0.15, -0.5,  0   ],  // 2 l_thigh
  [ 0,    -0.4,  0   ],  // 3 l_shin
  [ 0,    -0.38, 0   ],  // 4 l_foot
  [ 0.15, -0.5,  0   ],  // 5 r_thigh
  [ 0,    -0.4,  0   ],  // 6 r_shin
  [ 0,    -0.38, 0   ],  // 7 r_foot
  [-0.2,   0.3,  0   ],  // 8 l_upper
  [-0.28,  0,    0   ],  // 9 l_lower
  [-0.25,  0,    0   ],  // 10 l_hand
];

function makeIdentityIBM(count: number): Float32Array {
  const ibm = new Float32Array(count * 16);
  for (let i = 0; i < count; i++) {
    const b = i * 16;
    ibm[b]      = 1;
    ibm[b + 5]  = 1;
    ibm[b + 10] = 1;
    ibm[b + 15] = 1;
  }
  return ibm;
}

export function createSkeleton(): Skeleton {
  const skeleton = new Skeleton(BONES, makeIdentityIBM(BONES.length));
  for (let i = 0; i < BONES.length; i++) {
    const [x, y, z] = BONE_LOCAL_POS[i];
    skeleton.localPositions[i * 3 + 0] = x;
    skeleton.localPositions[i * 3 + 1] = y;
    skeleton.localPositions[i * 3 + 2] = z;
  }
  skeleton.setRestPose();
  return skeleton;
}

export function createIdleClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'rotation',
    jointIndex: 1,
    times: new Float32Array([0, 0.5, 1.0]),
    values: new Float32Array([
      0, 0,  0.03, 0.9996,
      0, 0, -0.03, 0.9996,
      0, 0,  0.03, 0.9996,
    ]),
  });
  return new AnimationClip('idle', [track]);
}

export function createRunClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'rotation',
    jointIndex: 1,
    times: new Float32Array([0, 0.2, 0.4]),
    values: new Float32Array([
      0, 0, -0.1, 0.9950,
      0, 0,  0.1, 0.9950,
      0, 0, -0.1, 0.9950,
    ]),
  });
  return new AnimationClip('run', [track]);
}

// 8 方向跑动 clip（用轻微不同的旋转幅度区分方向）
export function createRunDirectionalClips(): AnimationClip[] {
  const directions = [
    { name: 'run-forward',       tilt:  0.10 },
    { name: 'run-forward-right', tilt:  0.09 },
    { name: 'run-right',         tilt:  0.08 },
    { name: 'run-back-right',    tilt: -0.09 },
    { name: 'run-back',          tilt: -0.10 },
    { name: 'run-back-left',     tilt: -0.09 },
    { name: 'run-left',          tilt:  0.08 },
    { name: 'run-forward-left',  tilt:  0.09 },
  ];
  return directions.map(({ name, tilt }) => {
    const track = new KeyframeTrack({
      targetPath: 'rotation',
      jointIndex: 1,
      times: new Float32Array([0, 0.2, 0.4]),
      values: new Float32Array([
        0, 0, -tilt, 0.9950,
        0, 0,  tilt, 0.9950,
        0, 0, -tilt, 0.9950,
      ]),
    });
    return new AnimationClip(name, [track]);
  });
}

// attack 动画 0.5s，不循环
export function createAttackClip(): AnimationClip {
  const track = new KeyframeTrack({
    targetPath: 'rotation',
    jointIndex: 1,
    times: new Float32Array([0, 0.15, 0.5]),
    values: new Float32Array([
      0, 0,  0,    1,
      0, 0, -0.3, 0.9539,
      0, 0,  0,    1,
    ]),
  });
  return new AnimationClip('attack', [track]);
}
