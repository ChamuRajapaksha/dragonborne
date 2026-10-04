# DragonBorne

A top-down 2D RPG built with Phaser 4 — wake up in a forest, find your way to a village, and
the quests and storylines you uncover depend on the class of character you create.

> **Short pitch:** You create a character, pick a class, and wake on a cold fire ring at the
> edge of the Thornwood with a stranger watching. From there you explore a top-down world in
> real time, cross into the village of Emberhold, and take work from its three residents. The
> quests available to you differ based on your class — class is a core pillar of the game,
> not a cosmetic choice.

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
   (Warrior / Rogue / Mage / Cleric / Ranger / Bard). The character is saved to localStorage.
2. You wake in **the Thornwood** on a fire ring, and a one-time intro card sets the scene.
   Move with **WASD** or **arrow keys** — trees, rocks, and water all block you.
3. The HUD shows the current area plus a waypoint line (`Emberhold: east, 42 tiles`); walk
   east along the dirt track toward the purple portal.
4. Step onto the portal and press **E** to travel to **Emberhold** — you arrive at the west
   gate. The waypoint line disappears here, because you have arrived.
5. Walk up to a gold NPC marker — a "Press E" hint appears — and press **E**. Brennan the
   Smith, Maerwyn the Archivist, and Odile the Host each greet you and offer their own
   quests, filtered to **your class**. A Warrior sees different work from a Mage; create a
   second character to compare. The Stranger in the forest gives every class the same first
   errand: *The Road to Emberhold*.
6. Press **Complete (stub)** on a quest to mark it complete; completed state persists. Quests
   with unmet stat requirements are listed but locked.
7. **Reload** the page: you come back in the area and at the coordinates you left, and the
   intro card does not reappear. Walk back west through the village portal to return to the
   Thornwood.
8. To start over, clear the site's localStorage from DevTools. `clearCharacter` /
   `localStorage.removeItem('dragonborne.character')` sends you back to character creation;
   `clearProgress` / `localStorage.removeItem('dragonborne.progress')` drops only your
   area, position, and intro-card flags, so the next load drops you back on the fire ring
   in the Thornwood with the intro card showing again. Clearing both is a full restart.

## Status

The forest → village vertical slice is **complete**: create character → wake in the forest →
walk the track → portal into Emberhold → talk to three NPCs → take class-appropriate quests →
complete them (stub). Area, position, and intro-card state all survive a reload. All
placeholder visuals.

Design decisions, locked scope, and the step-by-step build plan are documented in
[`docs/plan.md`](docs/plan.md).

## Current scope notes

- Placeholder art only (shapes/rectangles) — no final art in this phase.
- Two areas (`forest`, `village`), each a 64 × 48 ASCII map in `src/world/areas.ts`, rendered
  as a collidable tilemap and linked by portals. Adding an area is a data addition.
- Class and quest systems are **data-driven**: `src/character/classes.ts`,
  `src/story/quests.ts`, and `src/story/npcs.ts` are pure data. Quest availability is a
  filter (`getQuestsForNpc(npcId, classId)`), so new classes/quests are data additions with
  no hardcoded branches.
- Persistence is localStorage only: `dragonborne.character` for the character,
  `dragonborne.progress` for area, position, and flags.
- Explicitly out of scope this phase: multiplayer, combat, inventory,
  crafting/building, and branching narrative content. Completing a quest only flips a
  completion flag.

## Still TBD

Full class list, dice/stat resolution depth, combat system specifics, narrative
authoring approach, art style, and any backend beyond localStorage.

## Layout

- `src/character/` — `Character`/`CharacterClass` types, class list data, creation,
  localStorage save/load
- `src/story/` — `Quest` and `NpcDefinition` types, quest/npc data, class-availability and
  per-NPC filters, completion progress
- `src/world/` — `tileset.ts` (tile legend + generated tile sheet), `areas.ts` (area
  definitions, ASCII map parsing), `buildArea.ts` (terrain + markers + portals),
  `progress.ts` (world position/flag save-load)
- `src/scenes/` — `BootScene` (routes into the game, resumes saved progress), `WorldScene`
  (movement, NPCs, portals, HUD)
- `src/creationScreen.ts`, `src/questPopup.ts`, `src/introCard.ts` — DOM overlays for
  character creation, quests, and area intro text