# DragonBorne — Project Setup & Plan v0.2

> Status: Updated with confirmed direction (top-down 2D, class-based quests). Some items are still **TBD** — do not invent architecture around those, keep them behind clean interfaces. This doc replaces v0.1.

---

## 1. Vision

**DragonBorne** — the title doubles as the name of the final mission/story arc.

Plot summary:
- Player creates a character and picks a **class** at creation
- Character is dropped into a kingdom as a nobody — no reputation, no backstory privilege
- From there, the player explores a top-down 2D world and picks up quests/storylines
- **Quests and available storylines differ depending on class** — this is a core pillar, not a nice-to-have
- Gameplay feel: top-down 2D, real-time movement and exploration, in the spirit of Terraria (tight controls, explorable world, action-driven interaction with the environment) rather than a static menu-driven visual novel

**Assumption flagged:** "similar to Terraria" is being interpreted as *real-time top-down movement, exploration, and interacting with a live world*, not necessarily mining/building/crafting systems. If crafting/building is actually wanted, that's a separate system to scope later — flag this back if that assumption is wrong.

---

## 2. Locked decisions (updated)

| Decision | Choice |
|---|---|
| Rendering / engine | **Phaser 4** (top-down 2D confirmed — this replaces the old "menu vs explore" open question) |
| Language | TypeScript everywhere |
| Build tooling | Vite |
| Character system | Class-based at creation; class affects available quests/storylines |
| Multiplayer | Still out of scope for this phase |
| Version control | Git, with structured commits per step (see Section 6) |

## 3. Open decisions (still TBD — do not assume)

- [ ] Full class list (e.g. warrior/rogue/mage or a custom set) — build the system to support an arbitrary list, don't hardcode assumptions about exactly 3 classes
- [ ] Dice/stat-check resolution system depth (full d20-style vs simplified)
- [ ] Combat system specifics (real-time action combat vs turn-based encounters triggered on the map)
- [ ] Narrative authoring approach (hardcoded TS/JSON scenes for now vs. Ink/Yarn Spinner later)
- [ ] Art style (placeholder colored rectangles/circles are fine for v1 — do not spend time on final art)
- [ ] Backend/persistence beyond localStorage (Supabase, etc.) — not needed yet

**Instruction to agent:** Keep a clear seam between "class definition data" and "quest availability logic" so adding new classes or quests later doesn't require touching core systems.

---

## 4. Core loop (v1 target)

1. Player creates a character: name + class selection
2. Character spawns in the kingdom (a single small top-down map is enough for v1)
3. Player moves around with keyboard input (top-down, 4/8-direction movement)
4. Player can interact with at least one NPC or map trigger that offers a quest
5. Quest offered/available depends on the character's class
6. Accepting/completing a quest updates some simple state (flag, or a stub "quest complete" popup — full quest logic can be a stub for now)

This is the only loop to build in this phase. No inventory/crafting, no combat, no multiplayer.

---

## 5. System breakdown (v1 scope)

### 5.1 Character system
- `Character` data shape (id, name, class, stats — stats can be minimal/placeholder for now)
- Character creation screen: name input + class selection (support N classes via data, not hardcoded branches)
- Save/load via localStorage

### 5.2 World/movement system
- One Phaser scene representing "the kingdom" (a simple tilemap or even a flat colored background is fine for v1)
- Player sprite (placeholder rectangle/circle is fine) with top-down 4-directional movement via arrow keys/WASD
- Basic collision boundaries (don't walk off the map)

### 5.3 Quest/story system
- `Quest` data shape: id, title, description, `availableToClasses: string[]`, completion state
- A simple interaction trigger (e.g. walking near an NPC/marker and pressing an interact key) that shows available quests filtered by the player's class
- Accepting a quest just needs to update state — full quest logic/branching narrative is a later phase

### 5.4 UI layer
- Character creation screen and any quest/dialogue popups can be simple Phaser UI or DOM overlay — agent's choice, but keep it easy to hand-restyle later
- No polish pass needed yet — that's done by hand afterward
- Inventory pointer controls are Minecraft-style and live entirely in the DOM pack panel:
  left click picks up a whole stack and places it (topping a same-item stack up to its limit,
  otherwise swapping), right click takes half a stack or places a single unit, gear slots
  equip and unequip on click, and HTML5 drag & drop moves stacks between the pack and the
  hotbar. The stack in hand is held in inventory state (`cursor`, schema `version: 2`), so
  closing the panel returns it to the pack and a reload parks it there — an item is never
  lost. Hovering a filled slot shows an item tooltip: name, category/equip slot, description,
  stat bonuses and stack size, in the panel's rows and on the bottom hotbar. The README's
  "How to test the vertical slice" step 7 is the full interaction spec.

### 5.5 Explicitly not in scope this phase
- Multiplayer (no networking code at all)
- Combat system
- Crafting, building, mining — no sign-off, and none planned
- Full branching narrative content — one or two placeholder quests per class is enough

**Signed off after v0.2:** inventory and equipment are **in scope** — a 9-slot hotbar, a
27-slot pack, four gear slots feeding stat bonuses, world pickups and quest item rewards,
all persisted in localStorage (see the README). That sign-off covers inventory only; it
does not extend to crafting, combat or mining.

**Signed off in `fifth_plan.md`:** tree felling and trading are **in scope** — a one-time
woodcutter's axe pickup, three-hit tree felling that yields wood and leaves a permanent
stump (chop flags ride the world-progress `flags` record), a persisted gold wallet shown
in the HUD, and a data-driven trader in Emberhold who buys wood at a flat price. The axe
must be the selected hotbar item; selling drains the pack and the hotbar via
`removeItemEverywhere` before crediting gold. Mining rocks/ore, buying items, crafting,
durability and tree regrowth remain **out of scope**.

**Signed off in `.agents/plans/plan.md` (forest layout fix):** the Thornwood map data was
redesigned — the ASCII maps moved out of `areas.ts` into a pure, import-free
`src/world/maps.ts` (so they are unit-testable under plain node), and
`src/world/mapRules.ts` now enforces shape, walkable placements, spawn reachability to
every placement and trunk neighbour, an obstruction-free main corridor (rows 23–25), and a
minimum choppable-trunk count. The layout itself is solid canopy masses cut by a real
trail network (central north trail, east north trail, south trail to a rectangular logging
clearing), ~35–45 reachable trunks ringing the masses and the clearing, tall-grass and
bush clusters only at mass edges (no salt-and-pepper scatter), and a warmed rock palette
so stones no longer read as purple. No gameplay-logic changes; tree regrowth is still out
of scope.

**Signed off in `.agents/plans/plan.md` (forest regeneration & sapling loop):** the
hand-authored forest is replaced by a **seeded procedural layout** — the seed rides in
world progress (same save ⇒ same forest, so coordinate-keyed `chop:forest:x,y` flags stay
valid; a new save grows a different one). Solid canopy masses are gone: grove clusters
scatter across the interior and a **2×2 box flood fill** from the spawn
(`unreachedTiles` in `src/world/mapRules.ts`) seals any pocket or 1-tile crack into
canopy, so every open tile is walkable by the player body and only the world border and
standing trees block movement. Trunks stay on grove edges (~35–45), with light tall-grass
fringes hugging those edges. The economy gains a **buy** side: `SHOP_OFFERS` in
`src/economy/trade.ts` sells an Oak Sapling for 12 gold (3 logs ≈ 12 g — near-neutral, no
infinite gold), and the trade panel renders a Buy card (Buy 1 / Buy 10, disabled when
unaffordable) beside the Sell card, deducting gold only for units actually received. With
a sapling selected in the hotbar, standing at a stump and pressing **E** consumes one
sapling, clears the chop flag (`clearChopFlag`) and restores the trunk, closing the loop:
chop → sell wood → buy sapling → replant → chop again. This sign-off covers **buying
items** and **tree regrowth via saplings**, superseding the "buying items" and "tree
regrowth" out-of-scope entries in the two sign-off paragraphs above. Crafting, mining,
combat and multiplayer remain banned; passive natural regrowth (no sapling) stays out of
scope.

**Signed off in `.agents/plans/plan.md` (Brennan's smithy — weapons & tools):** a second
NPC service, `smith`, gives Brennan a dual role: pressing **E** opens a DOM shop panel
(`src/smithPanel.ts`, mirroring the trader's) that sells ten existing catalog items —
**Buy 1 only** — from a single tunable data table (`SMITH_OFFERS` in
`src/economy/smith.ts`). Every ware costs **gold AND materials**, never either/or:
iron-tier goods ask for `iron-ore` (the existing farmable village pickup), steel-tier
goods (Iron Sword, Ember Staff) for a new `steel-ingot` resource. Payment is
pre-validated by `smithShortfall` over gold plus material counts across slots and
hotbar, so a purchase is all-or-nothing and a short payment toasts the exact
shortfall. Steel enters the economy only through five one-time `onceFlag` ground
pickups (two forest, three village) and `+2 steel-ingot` on each of Brennan's three
class-filtered quests — no smelting, no crafting. An **Ask about work** button layers
his existing quest popup on top of the shop (closing quests returns to the wares), and
walk-away closes both, mirroring the trade panel's flags and DOM-existence sync. This
sign-off covers **buying wares for gold + materials** only; smelting, mining, combat
and multiplayer remain banned.

---

## 6. Step-by-step setup instructions for the agent

Work through these steps **in order**, committing after each one with a clear, conventional commit message. Don't batch everything into one commit.

1. **Init project**
   - `npm create vite@latest dragonborne -- --template vanilla-ts` (or equivalent TS+Vite scaffold)
   - `git init`, add a `.gitignore` (node_modules, dist, .env, etc.)
   - Commit: `chore: initial project scaffold`

2. **Add README**
   - Include: project name/short pitch, tech stack, how to run locally (`npm install`, `npm run dev`), current project status/phase, link to this plan doc (copy it into `/docs/plan.md`)
   - Commit: `docs: add README and project plan`

3. **Install Phaser**
   - `npm install phaser` (Phaser 4 — confirm the installed version is 4.x, not 3.x)
   - Use the project's available Phaser 4 skill for engine-specific setup conventions (scene lifecycle, renderer config, asset loading) rather than relying on older Phaser 3 patterns
   - Set up a minimal Phaser game config with one empty scene that boots correctly
   - Commit: `feat: set up Phaser boot scene`

4. **Character data model + creation screen**
   - Add `/src/character` module with `Character` type, class list data, save/load functions
   - Build a simple creation screen (name input, class selection) — can be plain DOM/HTML over the canvas for this step, styling not important yet
   - Commit: `feat: character creation and save/load`

5. **World scene + player movement**
   - Add a basic tilemap or flat background scene representing the kingdom
   - Add a player sprite (placeholder shape ok) with top-down movement and map boundary collision
   - Commit: `feat: kingdom scene with player movement`

6. **Quest data + class-filtered interaction**
   - Add `/src/story` (or `/src/quests`) module with `Quest` type and a small set of placeholder quests, at least one per class
   - Add a simple interact trigger in the world scene that shows quests filtered by the player's class
   - Commit: `feat: class-filtered quest interaction`

7. **Wire it end-to-end**
   - Ensure: create character → spawn in kingdom → move around → interact → see class-appropriate quest → "complete" it (stub is fine)
   - Commit: `feat: complete v1 vertical slice loop`

8. **Update README**
   - Reflect actual current state, how to test the vertical slice, and clearly list what's still TBD/out of scope (copy from Section 3 above)
   - Commit: `docs: update README with current project status`

**Commit message convention:** use `type: short description` (`feat`, `fix`, `chore`, `docs`) so history stays easy to scan.

---

## 7. Draft data model

```ts
type CharacterClass = {
  id: string;
  name: string; // e.g. "Warrior", "Rogue" — final list TBD
};

type Character = {
  id: string;
  name: string;
  classId: string;
  stats: Record<string, number>; // placeholder, final stat list TBD
  createdAt: string;
};

type Quest = {
  id: string;
  title: string;
  description: string;
  availableToClasses: string[]; // classIds
  completed: boolean;
};
```

---

## 8. Definition of done for this phase (vertical slice)

- Player can create a character with a name and class
- Player spawns in a top-down kingdom scene and can move around with collision boundaries
- Player can trigger an interaction and see at least one quest available specifically to their class (a different class should see a different quest)
- Completing the quest updates state (a stub confirmation is fine)
- README accurately describes setup, current status, and next steps
- Git history shows the incremental commits from Section 6, not one giant commit

---

## 9. Notes for the agent

- Keep class/quest data structured (not hardcoded if/else chains) so adding classes and quests later is just data changes.
- Use placeholder art (rectangles, circles, basic shapes) — do not spend time on final visuals.
- Flag back if "Terraria-like" is expected to include crafting/building/mining — current scope assumes it does not.
- Do not add multiplayer or combat systems in this phase without explicit sign-off.
- Inventory/equipment/world pickups **have** explicit sign-off and are implemented (see §5.5); crafting, building and mining do not.
- Tree felling and trading (sell wood for gold) **have** explicit sign-off and are implemented (see §5.5); mining rocks/ore and crafting do not.
- The forest layout redesign **has** explicit sign-off (see §5.5): a trail network with ~35–45 choppable trunks, map data pure in `src/world/maps.ts`, rules in `src/world/mapRules.ts`.
- The forest regeneration & sapling loop **has** explicit sign-off (see §5.5): seeded procedural forest with full 2×2 walkable connectivity, a 12-gold sapling sold by the trader, and replanting felled stumps with **E** — which signs off *buying items* and *tree regrowth via saplings*, superseding those two out-of-scope entries above. Passive natural regrowth, mining, combat and multiplayer remain out of scope.
- Brennan's smithy **has** explicit sign-off (see §5.5): a `smith` NPC service selling ten wares for gold AND iron-ore/steel-ingot from the data table in `src/economy/smith.ts`, steel fed only by five one-time pickups and quest rewards, with an **Ask about work** button layering his class-filtered quests on top. Smelting, mining, combat and multiplayer remain out of scope.
- **Phaser version:** this project uses Phaser 4, not Phaser 3. Phaser 4 has a rebuilt WebGL renderer and a cleaner logic/rendering separation compared to Phaser 3 — use the project's Phaser 4 skill for engine-specific conventions rather than defaulting to older Phaser 3 patterns you may know from training data. If a Phaser 3 vs 4 API difference matters for a given step, flag it rather than guessing.