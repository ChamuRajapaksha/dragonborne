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
5. Walk up to a gold NPC marker — a "Press E" hint appears — and press **E**. Maerwyn the
   Archivist and Odile the Host each greet you and offer their own quests, filtered to
   **your class**. Brennan the Smith opens his smithy instead (see the smithy step below) —
   his quests live behind its **Ask about work** button. A Warrior sees different work from
   a Mage; create a second character to compare. The Stranger in the forest gives every
   class the same first errand: *The Road to Emberhold*.
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
   - **Hover any filled slot** (pack, panel hotbar row, gear slot, or the bottom hotbar) to
     see its tooltip: name, category and equip slot, the flavour description, its stat
     bonuses, and the stack size. Empty slots show nothing.
8. Items lie in the world as small coloured tiles — walk up to one and press **E** to pick
   it up (an item-name hint appears when you are close). Pickups respawn when you leave and
   re-enter the area, except the few flagged as one-time. If your pack is full the item
   stays on the ground rather than being consumed.
9. The Thornwood is **generated from a seed kept in your save**: randomised tree groves
   scatter across the interior, and the open ground between them is verified walkable by
   your two-tile-wide body — only the world border and standing trees block you, so you can
   loop the whole map. A save's forest is always the same (chop flags stay valid); a new
   save grows a different one. Dozens of choppable **tree trunks** ring the grove edges,
   with tall-grass fringes hugging them. A one-time **Woodcutter's Axe** lies on the
   ground east of the fire ring — pick it up and select it in the hotbar (**1**–**9**).
   Stand next to a trunk and press **E** three times: the trunk falls to a stump and drops
   wood logs into your pack (hotbar first). Without the axe selected the hint reads "Need
   an axe", and if your pack is full the tree holds at one hit rather than losing the wood.
   Felled trees stay stumps across reloads.
10. Take the wood to **Hollis the Trader** in the Emberhold market (south of the main road).
    Press **E** to open the trade panel, which shows your gold and how many logs you carry.
    **Sell 1**, **Sell 10**, or **Sell All** pays 4 gold per log, instantly. The panel also
    has a **Buy** card: **Oak Saplings** cost 12 gold each (**Buy 1** / **Buy 10**, disabled
    while you cannot afford them) — three logs ≈ twelve gold, so the loop is near-neutral
    with no infinite-gold trick. Gold is shown on a HUD line and persists in
    `dragonborne.wallet`.
11. **Replant:** select the sapling in the hotbar, stand next to a stump, and press **E**.
    One sapling is consumed, the trunk comes back, and the stump no longer reappears on
    reload — so the loop closes: chop → sell wood → buy a sapling → replant → chop again.
    The hint reads "Need a sapling" when the wrong item is selected or you carry none.
12. **Brennan's smithy:** press **E** at Brennan in the Emberhold market to open his shop
    panel. Eleven wares are listed, each priced in **gold AND materials** — iron-tier goods
    cost gold + iron ore (farmable from village pickups), while the Iron Sword and Ember
    Staff cost gold + steel ingots. **Buy 1** is disabled until you can cover the whole
    price; a failed purchase toasts exactly what you are short of (e.g. "Need 2 more Steel
    Ingot"). Steel is deliberately scarce: five one-time ground pickups (two in the
    Thornwood, three in the village) plus **+2 Steel Ingot** on each of Brennan's three
    class-filtered quests. **Ask about work** opens his quest list on top of the shop;
    closing it returns you to the wares. Walk away and the shop closes.
13. **The Crystal Cave:** buy Brennan's **Miner's Pickaxe** (25 gold + 3 Iron Ore — ore lies
    on the ground in the village and the Thornwood, so you can afford one before you ever
    see a cave), select it in the hotbar, then follow the Thornwood's main path east to the
    portal and press **E** to enter a third area, **the Crystal Cave** — a one-time intro
    card sets the scene and the HUD waypoint points back at the forest. The walls here are
    iron ore and steel veins, and they block your way. Stand next to one and press **E**:
    iron takes three swings for **+2 Iron Ore**, steel takes four for **+1 Steel Ingot**
    (a toast counts the swings down; the final swing is refused while your pack cannot hold
    the whole yield, so ore is never lost). Without the pickaxe selected the hint reads
    "Need a pickaxe". Mined nodes become walkable pockets **permanently** — they survive
    reloads and never grow back, and the vein's swings-hits-yield balance is plain data in
    `src/world/ore.ts`.
14. **Reload** the page: you come back in the area and at the coordinates you left, and the
    intro card does not reappear. Felled trees, mined veins, gold, and everything else
    survive. Walk back west through the village portal to return to the Thornwood.
15. To start over, clear the site's localStorage from DevTools. `clearCharacter` /
    `localStorage.removeItem('dragonborne.character')` sends you back to character creation;
    `clearProgress` / `localStorage.removeItem('dragonborne.progress')` drops only your
    area, position, and intro-card flags, so the next load drops you back on the fire ring
    in the Thornwood with the intro card showing again. `localStorage.removeItem('dragonborne.inventory')`,
    `localStorage.removeItem('dragonborne.wallet')`, and
    `localStorage.removeItem('dragonborne.quests.completed')` reset your gear, gold, and
    quest progress. Clearing all of them is a full restart.

## Status

The forest → village vertical slice, the inventory plan, the chopping/wood/trading
plan, the forest layout redesign, the forest regeneration loop, Brennan's smithy,
**and** the mining plan are **complete**:
create character → wake in the forest → find the axe → chop trees for wood → carry it to
Emberhold → sell it to Hollis the Trader for gold → buy a sapling back and replant the
stump. You start with a traveller's kit, pick items up off the ground, and
move stacks around a 9-slot hotbar and a 27-slot pack with click-to-pick-up/place,
right-click half/single, or real drag & drop; wear gear in four equipment slots, and its
stat bonuses feed into your character — enough to unlock stat-gated quests. Brennan sells
eleven wares for gold + iron ore or steel ingots, paid all-or-nothing from a data-driven
price table, and his quests (behind **Ask about work**) pay steel back. Buy his **Miner's
Pickaxe** and a portal on the Thornwood's main path opens **the Crystal Cave**, a third
area full of iron ore and steel veins you swing out of the wall with **E** — each node
depletes permanently into a walkable pocket that survives reloads. The Thornwood
is grown procedurally from the seed stored in your save: randomised groves across an
interior guaranteed to loop end to end, ~35–45 choppable trunks on the grove edges,
tall-grass fringes at those edges, warm-toned rocks, and the hand-authored village as-is.
Area, position, flags, inventory, gold, felled trees, mined veins, and completed quests
all survive a reload. All placeholder visuals.

Design decisions, locked scope, and the step-by-step build plan are documented in
[`docs/plan.md`](docs/plan.md). The plans that produced the current game — the 22-commit
forest/village world (`first_plan.md`), the 41-commit inventory/equipment/pickups plan
(`second_plan.md`), the forest regeneration & sapling loop, Brennan's smithy, and the
mining / Crystal Cave plan — live locally (and untracked, like `.agents/` itself) at
`.agents/plans/`.

## Current scope notes

- Placeholder art only (shapes/rectangles) — no final art in this phase.
- Three areas (`forest`, `village`, `cave`), rendered as collidable tilemaps and linked by
  portals: the forest and village are 64 × 48, the Crystal Cave 48 × 32. The village and
  the cave stay hand-authored ASCII in `src/world/maps.ts`; the
  forest is **grown from a seed** in `src/world/forestGen.ts` (seed persisted in world
  progress — same save, same forest). All are pure data (no engine imports) and are
  checked by unit tests (`src/world/mapRules.ts` + `areas.test.ts`): uniform shape,
  walkable placements, spawn reachability to every placement and trunk/ore neighbour, an
  obstruction-free main corridor (rows 23–25), minimum choppable-trunk and ore-node
  counts, and — for the forest —
  every open tile reachable by the 2×2 player body. Adding an area is a data addition.
- Class, quest and item systems are **data-driven**: `src/character/classes.ts`,
  `src/story/quests.ts`, `src/story/npcs.ts`, and `src/inventory/catalog.ts` are pure data.
  Quest availability is a filter (`getQuestsForNpc(npcId, classId)`) and quest rewards are
  data (`rewards: [{ itemId, quantity }]`), so new classes, quests, and items are data
  additions with no hardcoded branches.
- Inventory is in scope by explicit sign-off: a 9-slot hotbar, a 27-slot pack, four
  equipment slots with stat bonuses, world pickups (walk up + **E**), and quest item
  rewards. **Still out of scope:** crafting, and combat.
- Tree felling, the gold wallet, and trading wood are in scope by explicit sign-off (the
  `fifth_plan.md` override). The axe must be the selected hotbar item; trees take three
  hits, drop wood, and leave a permanent stump until replanted. The trader buys wood and
  sells saplings, both from data-driven tables (`src/economy/trade.ts`: 4 g per log, 12 g
  per sapling); gold persists in `dragonborne.wallet`. **Buying items** and **tree
  regrowth** are signed off by the regeneration plan — but only via the sapling loop:
  purchase a sapling, select it at a stump, press **E**. **Still out of scope:** crafting,
  durability, and passive regrowth that needs no sapling.
- Brennan's smithy is in scope by explicit sign-off: a `smith` NPC service opens a shop
  panel selling eleven wares, each priced in **gold AND materials** from the data table in
  `src/economy/smith.ts` (iron-tier goods cost iron ore, steel-tier goods cost steel
  ingots), charged all-or-nothing via `smithShortfall`. Steel reaches the economy through
  five one-time ground pickups, `+2` on each of Brennan's three quests, and the steel
  veins mined in the Crystal Cave — the smithy itself is an `iron-ore`/`steel-ingot` sink,
  not a source. **Still out of scope:** smelting or crafting raw materials into steel.
- Mining is in scope by explicit sign-off (`.agents/plans/plan.md`): the **Miner's
  Pickaxe** sold by Brennan (25 gold + 3 iron ore), the `o`/`v`/`x` tiles in
  `src/world/tileset.ts`, and a third area — the Crystal Cave — on a portal off the
  Thornwood main path. Node hits, yields and item ids are pure data in `src/world/ore.ts`
  (iron: 3 swings → **+2 Iron Ore**; steel: 4 swings → **+1 Steel Ingot**), and depletion
  is permanent: `mine:area:x,y` flags in world progress restore each node as a walkable
  pocket on reload, with no regrowth and no refining step. **Still out of scope:**
  smelting, crafting, combat, and multiplayer.
- Persistence is localStorage only: `dragonborne.character` for the character,
  `dragonborne.progress` for area, position, and flags (including chop and mine flags),
  `dragonborne.inventory` for the inventory (versioned schema), `dragonborne.wallet` for
  gold (versioned schema), and `dragonborne.quests.completed` for quest state.
- Explicitly out of scope: multiplayer, combat, crafting/building, and branching
  narrative content.

## Still TBD

Full class list, dice/stat resolution depth, combat system specifics, narrative
authoring approach, art style, and any backend beyond localStorage.

## Layout

- `src/character/` — `Character`/`CharacterClass` types, class list data, creation,
  localStorage save/load
- `src/story/` — `Quest`/`NpcDefinition` types, quest/npc data (including item rewards),
  class-availability and per-NPC filters, completion progress
- `src/world/` — `tileset.ts` (tile legend + generated tile sheet), `maps.ts` (pure ASCII
  village + Crystal Cave maps and NPC/portal/item placements), `mapRules.ts` (pure map
  validation rules), `ore.ts` (ore node definitions: hits, yield, item id), `forestGen.ts`
  (seeded procedural forest with 2×2 connectivity), `areas.ts` (area
  definitions composing the maps), `buildArea.ts` (terrain + markers + portals + pickups),
  `progress.ts` (world position/flag/seed save-load)
- `src/inventory/` — item types and catalog, pure inventory logic (add/move/split/equip,
  effective stats, remove-everywhere), versioned storage, and the subscribing store
  singleton
- `src/economy/` — gold wallet pure helpers, versioned storage, subscribing store, the
  trader's buy/sell price tables, and the smith's ware cost table + shortfall helpers
- `src/scenes/` — `BootScene` (routes into the game, resumes saved progress), `WorldScene`
  (movement, NPCs, portals, pickups, chopping, replanting, mining, HUD)
- `src/creationScreen.ts`, `src/questPopup.ts`, `src/introCard.ts`, `src/tradePanel.ts`,
  `src/smithPanel.ts` — DOM overlays for character creation, quests, area intro text,
  trading, and the smithy
- `src/hotbar.ts`, `src/inventoryPanel.ts`, `src/itemIcon.ts`, `src/itemTooltip.ts`,
  `src/toast.ts` — DOM overlays for the hotbar, the pack panel, item glyphs, hover
  tooltips, and transient messages