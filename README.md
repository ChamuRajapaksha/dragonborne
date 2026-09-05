# DragonBorne

A top-down 2D RPG built with Phaser 4 — explore a living kingdom, and the quests and
storylines you uncover depend on the class of character you create.

> **Short pitch:** You create a character, pick a class, and land in a kingdom as a
> nobody. From there you explore a top-down world in real time. The quests and
> storylines available to you differ based on your class — class is a core pillar of
> the game, not a cosmetic choice.

## Tech stack

- **Phaser 4** — WebGL-rendered 2D game engine (not Phaser 3)
- **TypeScript** — all source code
- **Vite** — build tooling / dev server
- **localStorage** — persistence (no backend)

## How to run locally

```sh
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`) in a browser.

## Status

Early development — the project is being built as a **vertical slice** in incremental
steps:

1. Project scaffold (Vite + TS + Phaser boot scene) — in progress
2. Character creation with class selection + save/load
3. Kingdom scene with player movement
4. Class-filtered quest interaction
5. Wire the loop end-to-end: create character → spawn → move → interact → see
   class-appropriate quest → complete it (stub)

Design decisions and scope are documented in [`docs/plan.md`](docs/plan.md).

## Scope notes

- Placeholder art only (shapes/rectangles) — no final art in this phase.
- Explicitly out of scope this phase: multiplayer, combat, inventory,
  crafting/building, and branching narrative content.
- Class and quest systems are **data-driven**, so new classes/quests are pure data
  additions — no hardcoded if/else chains.