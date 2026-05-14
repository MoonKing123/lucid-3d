/**
 * scripts/regression-mapping.ts
 * Phase 50-57 Issue → Demo 映射表，供 KR4 批量评论驱动脚本使用。
 */

export interface MappingEntry {
  issue: number;
  phase: number;
  kr: string;
  demo: string;
}

export const ISSUE_MAPPING: MappingEntry[] = [
  // Phase 50 — 色彩滤镜 v4
  { issue: 366, phase: 50, kr: 'KR1 ColorLUTPass', demo: 'br-12p' },
  { issue: 367, phase: 50, kr: 'KR2 PosterizePass', demo: 'br-12p' },
  { issue: 368, phase: 50, kr: 'KR3 DitherPass', demo: 'br-12p' },
  // Phase 51 — 深度后处理
  { issue: 372, phase: 51, kr: 'KR1 DepthPass', demo: 'action-rpg-v2' },
  { issue: 373, phase: 51, kr: 'KR2 DOFPass', demo: 'action-rpg-v2' },
  { issue: 374, phase: 51, kr: 'KR3 SSAOPass', demo: 'action-rpg-v2' },
  // Phase 52 — 体积光雾效
  { issue: 378, phase: 52, kr: 'KR1 DepthFogPass', demo: 'slg-3d' },
  { issue: 379, phase: 52, kr: 'KR2 GodRaysPass', demo: 'slg-3d' },
  { issue: 380, phase: 52, kr: 'KR3 AtmosphericPerspective', demo: 'slg-3d' },
  // Phase 53 — CSM 阴影
  { issue: 384, phase: 53, kr: 'KR1 CascadeSplitter', demo: 'action-rpg-v2' },
  { issue: 385, phase: 53, kr: 'KR2 CascadedShadowMap', demo: 'action-rpg-v2' },
  { issue: 386, phase: 53, kr: 'KR3 PhongMaterial CSM', demo: 'action-rpg-v2' },
  // Phase 54 — IK
  { issue: 390, phase: 54, kr: 'KR1 TwoBoneIK', demo: 'action-rpg-v2' },
  { issue: 391, phase: 54, kr: 'KR2 CCDSolver', demo: 'action-rpg-v2' },
  { issue: 392, phase: 54, kr: 'KR3 IKChain', demo: 'action-rpg-v2' },
  // Phase 55 — StateMachine + BlendTree
  { issue: 396, phase: 55, kr: 'KR1 AnimationStateMachine', demo: 'action-rpg-v2' },
  { issue: 397, phase: 55, kr: 'KR2 BlendTree1D', demo: 'action-rpg-v2' },
  { issue: 398, phase: 55, kr: 'KR3 BlendTree2D', demo: 'action-rpg-v2' },
  // Phase 56 — M6 demo
  { issue: 402, phase: 56, kr: 'KR1 M6.1 脚手架', demo: 'action-rpg-v2' },
  { issue: 403, phase: 56, kr: 'KR2 M6.2 Enemy NPC', demo: 'action-rpg-v2' },
  { issue: 404, phase: 56, kr: 'KR3 M6.3 战斗系统', demo: 'action-rpg-v2' },
  { issue: 405, phase: 56, kr: 'KR4 M6.4 HUD', demo: 'action-rpg-v2' },
  { issue: 406, phase: 56, kr: 'KR5 M6.5 E2E', demo: 'action-rpg-v2' },
  // Phase 57 — M7 网络
  { issue: 412, phase: 57, kr: 'KR1 src/net/ Transport', demo: 'br-12p' },
  { issue: 413, phase: 57, kr: 'KR2 State Sync', demo: 'br-12p' },
  { issue: 414, phase: 57, kr: 'KR3 Lockstep', demo: 'br-12p' },
  { issue: 415, phase: 57, kr: 'KR4 br-12p 改造', demo: 'br-12p' },
];

export function getMappingForIssue(issue: number): MappingEntry | undefined {
  return ISSUE_MAPPING.find(m => m.issue === issue);
}

export function getAllIssueNumbers(): number[] {
  return ISSUE_MAPPING.map(m => m.issue);
}
