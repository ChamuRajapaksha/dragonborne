# DragonBorne — AGENTS.md

Phaser 4 + TypeScript + Vite top-down 2D RPG. The canonical source of truth is
`.agents/plans/Dragonborne_project_plan.md` (v0.2) — read it before doing any work
and follow its locked decisions. This file only captures what that plan doesn't make
obvious.

## What this project is

- Top-down 2D, real-time movement/exploration in the spirit of Terraria. Explicitly
  **no** crafting/building/mining unless signed off — the plan assumes "Terraria-like"
  means movement + a live explorable world only.
- Class-based character system is a **core pillar**: classes are data-driven, and a
  character's class determines which quests/storylines are available.
- **Phaser 4, not Phaser 3.** The engine has a rebuilt WebGL renderer and a cleaner
  logic/rendering separation. Do not reach for older Phaser 3 API patterns from memory;
  load the `phaser-core` skill for engine conventions and flag any 3-vs-4 API question
  rather than guessing.

## Constraints (do not violate)

- **No** multiplayer, combat, inventory, or crafting in this phase — building any of
  these requires explicit sign-off.
- Class/quest data must be structured (driven by data), **not** hardcoded if/else
  chains, so new classes/quests are pure data additions. Keep a clean seam between
  "class definition data" and "quest availability logic."
- Placeholder art only (shapes/rectangles). Do not spend time on final visuals.
- Persistence is localStorage only. No backend/network layer.
- Still TBD (leave behind clean interfaces, don't invent): full class list, dice/stat
  resolution depth, combat specifics, narrative authoring approach, art style.

## Status

The repo is at the **start** (setup has not begun): no Vite scaffold, no `git init`, no
source code yet. Work proceeds through the plan's Section 6 steps in order.

## Workflow

- Commit after **each** of the plan's Section 6 steps, never batching steps into one
  commit. Follow the `git-commit` skill.
- Conventional commit messages: `feat`, `fix`, `chore`, `docs` scoped to the step
  (e.g. `feat: kingdom scene with player movement`). Exact commit messages are listed
  in the plan.
- UI layer (creation screen, quest/dialogue popups) may be Phaser UI or DOM overlay —
  keep it easy to hand-restyle later. No polish pass yet.

## Structure (planned)

- `/src/character` — `Character` type, class list data, save/load (localStorage)
- `/src/story` (or `/src/quests`) — `Quest` type + class-availability filtering
- A Phaser scene for the kingdom (world/movement); the plan aims for a single small map
  for v1.
