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
- **Vitest** — unit tests for the pure inventory logic
- **localStorage** — persistence (no backend)

## How to run locally

```sh
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`) in a browser. `npm test` runs
the Vitest suite.

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
6. Press **Complete (stub)** on a quest to mark it complete: it pays the quest's item
   rewards into your pack (a toast confirms what arrived) and the completed state persists.
   Quests with unmet stat requirements are listed but locked — bonuses from equipped gear
   count toward them.
7. Your **hotbar** runs along the bottom of the screen; press **1**–**9** to select a slot
   and the HUD names the selected item. Press **I** to open the pack. The pack panel is the
   movement surface — it holds the same 9-slot hotbar row plus the 27 pack slots, and gear
   slots on the side:
   - **Left click** a stack to pick it up whole; left click again to drop it. Dropping onto
     the same item tops the stack up to its limit, dropping onto a different item swaps the
     two, and anything that will not fit stays in your hand.
   - **Right click** picks up half a stack (rounded up); while carrying, right click drops a
     single unit at a time.
   - **Drag & drop** works as well: drag a stack from any pack or hotbar slot onto another
     slot, or drag a piece of gear onto a slot to equip it and drag it back out again.
   - **Click a gear slot** to equip the item you are carrying (if it belongs there) or, with
     an empty hand, to take the worn item off.
   - The stack in hand follows the pointer. Closing the panel (**I** or **Close**) returns it
     to your pack, hotbar, or its own empty gear slot — and a reload parks it in the pack, so
     an item is never lost.
8. Items lie in the world as small coloured tiles — walk up to one and press **E** to pick
   it up (an item-name hint appears when you are close). Pickups respawn when you leave and
   re-enter the area, except the few flagged as one-time. If your pack is full the item
   stays on the ground rather than being consumed.
9. **Reload** the page: you come back in the area and at the coordinates you left, and the
   intro card does not reappear. Walk back west through the village portal to return to the
   Thornwood.
10. To start over, clear the site's localStorage from DevTools. `clearCharacter` /
    `localStorage.removeItem('dragonborne.character')` sends you back to character creation;
    `clearProgress` / `localStorage.removeItem('dragonborne.progress')` drops only your
    area, position, and intro-card flags, so the next load drops you back on the fire ring
    in the Thornwood with the intro card showing again. `localStorage.removeItem('dragonborne.inventory')`
    and `localStorage.removeItem('dragonborne.quests.completed')` reset your gear and quest
    progress. Clearing all of them is a full restart.

## Status

The forest → village vertical slice **and** the inventory plan are **complete**: create
character → wake in the forest → walk the track → portal into Emberhold → talk to NPCs →
take class-appropriate quests → complete them for item rewards. You start with a
traveller's kit, pick items up off the ground, and move stacks around a 9-slot hotbar and a
27-slot pack with click-to-pick-up/place, right-click half/single, or real drag & drop;
wear gear in four equipment slots, and its stat bonuses feed into your character — enough to
unlock stat-gated quests. Area, position, flags, inventory, and completed quests all survive
a reload. All placeholder visuals.

Design decisions, locked scope, and the step-by-step build plan are documented in
[`docs/plan.md`](docs/plan.md). The plans that produced the current game — the 22-commit
forest/village world (`first_plan.md`) and the 41-commit inventory/equipment/pickups plan
(`second_plan.md`) — live locally (and untracked, like `.agents/` itself) at
`.agents/plans/`.

## Current scope notes

- Placeholder art only (shapes/rectangles) — no final art in this phase.
- Two areas (`forest`, `village`), each a 64 × 48 ASCII map in `src/world/areas.ts`, rendered
  as a collidable tilemap and linked by portals. Adding an area is a data addition.
- Class, quest and item systems are **data-driven**: `src/character/classes.ts`,
  `src/story/quests.ts`, `src/story/npcs.ts`, and `src/inventory/catalog.ts` are pure data.
  Quest availability is a filter (`getQuestsForNpc(npcId, classId)`) and quest rewards are
  data (`rewards: [{ itemId, quantity }]`), so new classes, quests, and items are data
  additions with no hardcoded branches.
- Inventory is in scope by explicit sign-off: a 9-slot hotbar, a 27-slot pack, four
  equipment slots with stat bonuses, world pickups (walk up + **E**), and quest item
  rewards. **Still out of scope:** crafting, combat, and mining/breaking world objects.
- Persistence is localStorage only: `dragonborne.character` for the character,
  `dragonborne.progress` for area, position, and flags, `dragonborne.inventory` for the
  inventory (versioned schema), and `dragonborne.quests.completed` for quest state.
- Explicitly out of scope: multiplayer, combat, crafting/building/mining, and branching
  narrative content.

## Still TBD

Full class list, dice/stat resolution depth, combat system specifics, narrative
authoring approach, art style, and any backend beyond localStorage.

## Layout

- `src/character/` — `Character`/`CharacterClass` types, class list data, creation,
  localStorage save/load
- `src/story/` — `Quest`/`NpcDefinition` types, quest/npc data (including item rewards),
  class-availability and per-NPC filters, completion progress
- `src/world/` — `tileset.ts` (tile legend + generated tile sheet), `areas.ts` (area
  definitions, ASCII map parsing, NPC/portal/item placements), `buildArea.ts` (terrain +
  markers + portals + pickups), `progress.ts` (world position/flag save-load)
- `src/inventory/` — item types and catalog, pure inventory logic (add/move/split/equip,
  effective stats), versioned storage, and the subscribing store singleton
- `src/scenes/` — `BootScene` (routes into the game, resumes saved progress), `WorldScene`
  (movement, NPCs, portals, pickups, HUD)
- `src/creationScreen.ts`, `src/questPopup.ts`, `src/introCard.ts` — DOM overlays for
  character creation, quests, and area intro text
- `src/hotbar.ts`, `src/inventoryPanel.ts`, `src/itemIcon.ts`, `src/toast.ts` — DOM
  overlays for the hotbar, the pack panel, item glyphs, and transient messages