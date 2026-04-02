# Lucid-3D — AI-native 3D Game Engine

AI-first, code-first, no-editor 3D game engine for WeChat mini-games.

## Architecture

```
src/
├── math/       # Vec3, Mat4, Quat — pure functions, zero deps
├── core/       # Node3D, SceneGraph, Transform
├── renderer/   # WebGL renderer, Shader, Material, Geometry
└── main.ts     # Demo entry point
test/
├── unit/       # vitest unit tests (math, logic)
└── visual/     # Playwright + SwiftShader visual regression tests
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
