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

### 5.5 Explicitly not in scope this phase
- Multiplayer (no networking code at all)
- Combat system
- Inventory/crafting/building
- Full branching narrative content — one or two placeholder quests per class is enough

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
- Do not add multiplayer, combat, or inventory systems in this phase without explicit sign-off.
- **Phaser version:** this project uses Phaser 4, not Phaser 3. Phaser 4 has a rebuilt WebGL renderer and a cleaner logic/rendering separation compared to Phaser 3 — use the project's Phaser 4 skill for engine-specific conventions rather than defaulting to older Phaser 3 patterns you may know from training data. If a Phaser 3 vs 4 API difference matters for a given step, flag it rather than guessing.