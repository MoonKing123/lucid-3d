# Lucid-3D 回归视觉证据报告

**生成时间**: 2026-05-10
**生成方式**: `tsx scripts/regression-screenshot.ts --demo all --phase 57`
**Phase 58 KR3**

## 总览

| Example | 状态 | 截图 | 失败原因 |
|---------|------|------|----------|
| runner-3d | ✅ pass | [4 张](./phase-57/runner-3d/) | - |
| action-rpg | ✅ pass | [4 张](./phase-57/action-rpg/) | - |
| action-rpg-v2 | ✅ pass | [4 张](./phase-57/action-rpg-v2/) | - |
| br-12p | ✅ pass | [4 张](./phase-57/br-12p/) | - |
| slg-3d | ✅ pass | [4 张](./phase-57/slg-3d/) | - |
| tower-defense-3d | ✅ pass | [4 张](./phase-57/tower-defense-3d/) | - |

**6/6** examples 通过。所有 example 通过

## 截图缩略图

### runner-3d

![0s](./phase-57/runner-3d/0s.png) ![5s](./phase-57/runner-3d/5s.png) ![15s](./phase-57/runner-3d/15s.png) ![30s](./phase-57/runner-3d/30s.png)

### action-rpg

![0s](./phase-57/action-rpg/0s.png) ![5s](./phase-57/action-rpg/5s.png) ![15s](./phase-57/action-rpg/15s.png) ![30s](./phase-57/action-rpg/30s.png)

### action-rpg-v2

![0s](./phase-57/action-rpg-v2/0s.png) ![5s](./phase-57/action-rpg-v2/5s.png) ![15s](./phase-57/action-rpg-v2/15s.png) ![30s](./phase-57/action-rpg-v2/30s.png)

### br-12p

![0s](./phase-57/br-12p/0s.png) ![5s](./phase-57/br-12p/5s.png) ![15s](./phase-57/br-12p/15s.png) ![30s](./phase-57/br-12p/30s.png)

### slg-3d

![0s](./phase-57/slg-3d/0s.png) ![5s](./phase-57/slg-3d/5s.png) ![15s](./phase-57/slg-3d/15s.png) ![30s](./phase-57/slg-3d/30s.png)

### tower-defense-3d

![0s](./phase-57/tower-defense-3d/0s.png) ![5s](./phase-57/tower-defense-3d/5s.png) ![15s](./phase-57/tower-defense-3d/15s.png) ![30s](./phase-57/tower-defense-3d/30s.png)

## 已上传评论的 issue 清单（KR4 完成）

Phase 58 KR4 批量评论脚本：`tsx scripts/post-phase58-kr4.ts`
证据日期：2026-05-10

| Phase | KR | Issue |
|-------|----|-------|
| Phase 50 KR1 ColorLUTPass | 色彩滤镜 | (#366) |
| Phase 50 KR2 PosterizePass | 色彩滤镜 | (#367) |
| Phase 50 KR3 DitherPass | 色彩滤镜 | (#368) |
| Phase 51 KR1 DepthPass | 深度后处理 | (#372) |
| Phase 51 KR2 DOFPass | 深度后处理 | (#373) |
| Phase 51 KR3 SSAOPass | 深度后处理 | (#374) |
| Phase 52 KR1 DepthFogPass | 体积光雾效 | (#378) |
| Phase 52 KR2 GodRaysPass | 体积光雾效 | (#379) |
| Phase 52 KR3 AtmosphericPerspective | 体积光雾效 | (#380) |
| Phase 53 KR1 CascadeSplitter | CSM 阴影 | (#384) |
| Phase 53 KR2 CascadedShadowMap | CSM 阴影 | (#385) |
| Phase 53 KR3 PhongMaterial CSM | CSM 阴影 | (#386) |
| Phase 54 KR1 TwoBoneIK | IK | (#390) |
| Phase 54 KR2 CCDSolver | IK | (#391) |
| Phase 54 KR3 IKChain | IK | (#392) |
| Phase 55 KR1 AnimationStateMachine | 状态机 | (#396) |
| Phase 55 KR2 BlendTree1D | 状态机 | (#397) |
| Phase 55 KR3 BlendTree2D | 状态机 | (#398) |
| Phase 56 KR1 M6.1 脚手架 | M6 demo | (#402) |
| Phase 56 KR2 M6.2 Enemy NPC | M6 demo | (#403) |
| Phase 56 KR3 M6.3 战斗系统 | M6 demo | (#404) |
| Phase 56 KR4 M6.4 HUD | M6 demo | (#405) |
| Phase 56 KR5 M6.5 E2E | M6 demo | (#406) |
| Phase 57 KR1 src/net/ Transport | M7 网络 | (#412) |
| Phase 57 KR2 State Sync | M7 网络 | (#413) |
| Phase 57 KR3 Lockstep | M7 网络 | (#414) |
| Phase 57 KR4 br-12p 改造 | M7 网络 | (#415) |
