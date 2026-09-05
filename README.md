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

## How to test the vertical slice

1. On first load you're asked to create a character: type a name and pick a class
   (Warrior / Rogue / Mage). The character is saved to localStorage.
2. You spawn in the kingdom map. Move with **WASD** or **arrow keys** (collisions with
   buildings and map edges included).
3. Walk up to the gold **Questmaster** marker — a "Press E" hint appears — and press
   **E**.
4. The quest panel lists only quests available to **your class**. Try each class to see
   different quests.
5. Press **Complete (stub)** on a quest to mark it complete; completed state persists.
6. Reloading the page skips creation and drops you straight back into the kingdom as
   your saved character. To start over, clear the site's localStorage.

## Status

The v1 vertical slice is **complete**: create character → spawn in kingdom → move →
interact → see class-appropriate quest → complete it (stub). All placeholder visuals.

Design decisions, locked scope, and the step-by-step build plan are documented in
[`docs/plan.md`](docs/plan.md).

## Current scope notes

- Placeholder art only (shapes/rectangles) — no final art in this phase.
- Class and quest systems are **data-driven**: `src/character/classes.ts` and
  `src/story/quests.ts` are pure data, so new classes/quests are data additions with
  no hardcoded branches.
- Explicitly out of scope this phase: multiplayer, combat, inventory,
  crafting/building, and branching narrative content. Completing a quest only flips a
  completion flag.

## Still TBD

Full class list, dice/stat resolution depth, combat system specifics, narrative
authoring approach, art style, and any backend beyond localStorage.

## Layout

- `src/character/` — `Character`/`CharacterClass` types, class list data, creation,
  localStorage save/load
- `src/story/` — `Quest` type, quest data, class-availability filter, completion
  progress
- `src/scenes/` — `BootScene` (routes into the game), `KingdomScene` (world +
  movement + quest interaction)
- `src/creationScreen.ts`, `src/questPopup.ts` — DOM overlays for creation and quests