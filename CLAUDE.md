# Lucid-3D — AI-native 3D Game Engine

AI-first, code-first, no-editor 3D game engine for WeChat mini-games.

## 📖 Read This First: `llms.txt`

Before exploring `src/`, **always read `llms.txt` first** — it's a condensed
symbol index of every public API in the engine (~500 lines vs ~15k lines of source).

Use `llms.txt` to:
- Discover which module owns a concept (e.g. "Is there a FollowCamera? Which file?")
- Check if an API already exists before implementing from scratch
- Get function signatures without reading entire source files

Only Read the actual source file when you need implementation details
(full method signatures, default values, internal behavior).

Regenerate after adding new src/ modules: `node scripts/gen-llms-txt.mjs`

## Architecture

```
src/
├── math/       # Vec3, Mat4, Quat — pure functions, zero deps
├── core/       # Node3D, SceneGraph, Transform
├── renderer/   # WebGL renderer, Shader, Material, Geometry
├── animation/  # Skeleton, SkinnedMesh, AnimationMixer
├── physics/    # SphereCollider, BoxCollider, CollisionWorld
├── navigation/ # NavGrid, A*, NavAgent
├── audio/      # AudioListener, PositionalAudio, AudioPool
├── gameplay/   # StateMachine, EventEmitter, Timer, CharacterController
├── ui/         # UICanvas, UIText, UIButton, UIProgressBar
├── helpers/    # AxesHelper, GridHelper, BoundingBoxHelper
└── loader/     # gltf-loader, texture-loader
test/
├── unit/       # vitest unit tests (math, logic)
└── visual/     # Playwright + SwiftShader visual regression tests
examples/
├── runner-3d/        # M1 — 3D 跑酷集成 demo
├── tower-defense-3d/ # M2 — 3D 塔防集成 demo
└── slg-3d/           # M3 — 3D SLG 大地图集成 demo
```

## Commands

```bash
pnpm install                         # Install dependencies
pnpm run dev                         # Dev server (port 5173)
pnpm run test                        # Unit tests (vitest)
pnpm run test:visual                 # Visual regression tests
pnpm run test:visual:update          # Update visual baselines
pnpm run test:all                    # All tests
```

## Development Rules

- **Test-first**: Every feature has pre-written tests. AI writes implementation.
- **Visual regression**: All rendering changes must pass `test:visual`.
- **Small PRs**: One feature per PR, linked to a GitHub Issue.
- **No editor needed**: Everything is code-driven. No GUI/editor dependency.

## Visual Testing

Uses Playwright + SwiftShader (CPU software WebGL) for deterministic rendering.

Key flags: `--use-angle=swiftshader` (NOT `--use-gl=swiftshader`)

```bash
node test/visual/flywheel-test.mjs          # Run visual tests
node test/visual/flywheel-test.mjs --update  # Regenerate baselines
```

## AI Agent Workflow (GitHub Issue driven)

1. Pick next open issue with label `ready`
2. Create branch `feat/issue-N`
3. Read issue spec (API requirements, test file paths)
4. Implement until `pnpm run test:all` passes
5. Create PR with `fixes #N`
6. Merge after all checks pass
