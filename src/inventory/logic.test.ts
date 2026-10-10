import { describe, expect, it } from 'vitest'
import {
  addItem,
  countItem,
  createEmptyInventory,
  effectiveStats,
  equipCursor,
  equipFromSlot,
  moveGearToSlot,
  moveStack,
  pickUpGear,
  pickUpHalf,
  pickUpSlot,
  placeCursor,
  placeOne,
  removeItem,
  returnCursor,
  splitStack,
  unequipToSlot,
} from './logic'
import type { EquipSlot, InventoryState, ItemStack } from './types'
import type { SlotRef } from './logic'

const grid = (index: number): SlotRef => ({ container: 'slots', index })
const bar = (index: number): SlotRef => ({ container: 'hotbar', index })

function withGridStack(state: InventoryState, index: number, stack: ItemStack | null): InventoryState {
  const slots = state.slots.slice()
  slots[index] = stack
  return { ...state, slots }
}

/** Every grid slot occupied by a full stack of `itemId`. */
function fillGrid(state: InventoryState, itemId: string, quantity: number): InventoryState {
  let next = state
  for (let index = 0; index < next.slots.length; index += 1) {
    next = addItem(next, itemId, quantity).state
  }
  return next
}

function withCursor(state: InventoryState, stack: ItemStack | null): InventoryState {
  return { ...state, cursor: stack }
}

describe('addItem', () => {
  it('places a new stack in the lowest free slot', () => {
    const result = addItem(createEmptyInventory(), 'heath-herb', 5)

    expect(result.added).toBe(5)
    expect(result.remainder).toBe(0)
    expect(result.state.slots[0]).toEqual({ itemId: 'heath-herb', quantity: 5 })
    expect(result.state.slots.slice(1).every((slot) => slot === null)).toBe(true)
  })

  it('tops up a partial stack before opening a new slot', () => {
    const seeded = withGridStack(createEmptyInventory(), 0, { itemId: 'heath-herb', quantity: 50 })
    const result = addItem(seeded, 'heath-herb', 60)

    expect(result.remainder).toBe(0)
    expect(result.state.slots[0]).toEqual({ itemId: 'heath-herb', quantity: 99 })
    expect(result.state.slots[1]).toEqual({ itemId: 'heath-herb', quantity: 11 })
    expect(seeded.slots[0]).toEqual({ itemId: 'heath-herb', quantity: 50 })
  })

  it('splits an over-stack across slots and reports the remainder when full', () => {
    const result = addItem(createEmptyInventory(), 'iron-ore', 250)

    expect(result.added).toBe(250)
    expect(result.state.slots[0]).toEqual({ itemId: 'iron-ore', quantity: 99 })
    expect(result.state.slots[1]).toEqual({ itemId: 'iron-ore', quantity: 99 })
    expect(result.state.slots[2]).toEqual({ itemId: 'iron-ore', quantity: 52 })
  })

  it('returns the whole quantity as remainder for an unknown item', () => {
    const empty = createEmptyInventory()
    const result = addItem(empty, 'no-such-item', 3)

    expect(result.added).toBe(0)
    expect(result.remainder).toBe(3)
    expect(result.state).toEqual(empty)
  })
})

describe('removeItem', () => {
  it('empties the lowest-indexed stack first', () => {
    let state = createEmptyInventory()
    state = withGridStack(state, 0, { itemId: 'heath-herb', quantity: 40 })
    state = withGridStack(state, 1, { itemId: 'heath-herb', quantity: 40 })

    const result = removeItem(state, 'heath-herb', 50)

    expect(result.removed).toBe(50)
    expect(result.shortfall).toBe(0)
    expect(result.state.slots[0]).toBeNull()
    expect(result.state.slots[1]).toEqual({ itemId: 'heath-herb', quantity: 30 })
  })

  it('reports a shortfall when the container holds too little', () => {
    const state = addItem(createEmptyInventory(), 'heath-herb', 4).state
    const result = removeItem(state, 'heath-herb', 10)

    expect(result.removed).toBe(4)
    expect(result.shortfall).toBe(6)
    expect(result.state.slots[0]).toBeNull()
  })
})

describe('moveStack', () => {
  it('moves a stack whole into an empty slot', () => {
    const state = withGridStack(createEmptyInventory(), 0, { itemId: 'torch', quantity: 1 })
    const moved = moveStack(state, grid(0), grid(5))

    expect(moved.slots[0]).toBeNull()
    expect(moved.slots[5]).toEqual({ itemId: 'torch', quantity: 1 })
    expect(state.slots[0]).toEqual({ itemId: 'torch', quantity: 1 })
  })

  it('merges into a same-item target when there is room', () => {
    let state = createEmptyInventory()
    state = withGridStack(state, 0, { itemId: 'heath-herb', quantity: 10 })
    state = withGridStack(state, 1, { itemId: 'heath-herb', quantity: 20 })

    const moved = moveStack(state, grid(0), grid(1))

    expect(moved.slots[0]).toBeNull()
    expect(moved.slots[1]).toEqual({ itemId: 'heath-herb', quantity: 30 })
  })

  it('swaps when the target cannot absorb the whole stack', () => {
    let state = createEmptyInventory()
    state = withGridStack(state, 0, { itemId: 'heath-herb', quantity: 10 })
    state = withGridStack(state, 1, { itemId: 'heath-herb', quantity: 95 })

    const moved = moveStack(state, grid(0), grid(1))

    expect(moved.slots[0]).toEqual({ itemId: 'heath-herb', quantity: 95 })
    expect(moved.slots[1]).toEqual({ itemId: 'heath-herb', quantity: 10 })
  })

  it('swaps two different items', () => {
    let state = createEmptyInventory()
    state = withGridStack(state, 0, { itemId: 'torch', quantity: 1 })
    state = withGridStack(state, 2, { itemId: 'iron-ore', quantity: 7 })

    const moved = moveStack(state, grid(0), grid(2))

    expect(moved.slots[0]).toEqual({ itemId: 'iron-ore', quantity: 7 })
    expect(moved.slots[2]).toEqual({ itemId: 'torch', quantity: 1 })
  })

  it('carries a stack between the hotbar and the grid', () => {
    const state = withGridStack(createEmptyInventory(), 3, { itemId: 'bedroll', quantity: 1 })
    const moved = moveStack(state, grid(3), bar(3))

    expect(moved.slots[3]).toBeNull()
    expect(moved.hotbar[3]).toEqual({ itemId: 'bedroll', quantity: 1 })
  })

  it('is a no-op for the same slot, an empty source, and an out-of-range target', () => {
    const state = withGridStack(createEmptyInventory(), 0, { itemId: 'torch', quantity: 1 })

    expect(moveStack(state, grid(0), grid(0))).toEqual(state)
    expect(moveStack(state, grid(1), grid(2))).toEqual(state)
    expect(moveStack(state, grid(0), grid(999))).toEqual(state)
  })
})

describe('splitStack', () => {
  it('splits the amount into the lowest free slot', () => {
    const state = withGridStack(createEmptyInventory(), 2, { itemId: 'iron-ore', quantity: 10 })
    const split = splitStack(state, grid(2), 4)

    expect(split.slots[0]).toEqual({ itemId: 'iron-ore', quantity: 4 })
    expect(split.slots[2]).toEqual({ itemId: 'iron-ore', quantity: 6 })
  })

  it('is a no-op when the amount is not a real split or no slot is free', () => {
    const stack = { itemId: 'iron-ore', quantity: 10 }
    const state = withGridStack(createEmptyInventory(), 0, stack)

    expect(splitStack(state, grid(0), 0)).toEqual(state)
    expect(splitStack(state, grid(0), 10)).toEqual(state)
    expect(splitStack(state, grid(0), -1)).toEqual(state)

    const full = fillGrid(state, 'iron-ore', 99)
    expect(splitStack(full, grid(0), 1)).toEqual(full)
  })
})

describe('equipFromSlot / unequipToSlot', () => {
  it('moves armour from the grid into its gear slot', () => {
    const state = withGridStack(createEmptyInventory(), 4, { itemId: 'leather-cap', quantity: 1 })
    const result = equipFromSlot(state, grid(4))

    expect(result.ok).toBe(true)
    expect(result.displaced).toBeNull()
    expect(result.state.slots[4]).toBeNull()
    expect(result.state.equipment.head).toEqual({ itemId: 'leather-cap', quantity: 1 })
    expect(state.slots[4]).toEqual({ itemId: 'leather-cap', quantity: 1 })
  })

  it('refuses empty slots and non-equippable items without changing state', () => {
    const empty = createEmptyInventory()
    expect(equipFromSlot(empty, grid(0))).toMatchObject({ ok: false, reason: 'empty-slot' })

    const resource = addItem(createEmptyInventory(), 'heath-herb', 3).state
    const result = equipFromSlot(resource, grid(0))

    expect(result).toMatchObject({ ok: false, reason: 'not-equippable' })
    expect(result.state).toEqual(resource)
  })

  it('puts the replaced piece of gear back where the new one came from', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'leather-cap', quantity: 1 })
    state = equipFromSlot(state, grid(0)).state
    state = withGridStack(state, 1, { itemId: 'iron-helm', quantity: 1 })

    const result = equipFromSlot(state, grid(1))

    expect(result.ok).toBe(true)
    expect(result.state.equipment.head).toEqual({ itemId: 'iron-helm', quantity: 1 })
    expect(result.state.slots[1]).toEqual({ itemId: 'leather-cap', quantity: 1 })
    expect(result.displaced).toEqual({ itemId: 'leather-cap', quantity: 1 })
  })

  it('returns gear to the lowest free slot when unequipping', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'leather-cap', quantity: 1 })
    state = equipFromSlot(state, grid(0)).state

    const result = unequipToSlot(state, 'head')

    expect(result.ok).toBe(true)
    expect(result.state.equipment.head).toBeNull()
    expect(result.state.slots[0]).toEqual({ itemId: 'leather-cap', quantity: 1 })
  })

  it('keeps the gear equipped when the inventory is full', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'leather-cap', quantity: 1 })
    state = equipFromSlot(state, grid(0)).state
    state = fillGrid(state, 'iron-ore', 99)

    const result = unequipToSlot(state, 'head')

    expect(result).toMatchObject({ ok: false, reason: 'inventory-full' })
    expect(result.state.equipment.head).toEqual({ itemId: 'leather-cap', quantity: 1 })
    expect(result.state).toEqual(state)
  })

  it('reports an empty gear slot', () => {
    expect(unequipToSlot(createEmptyInventory(), 'head')).toMatchObject({
      ok: false,
      reason: 'nothing-equipped',
    })
  })
})

describe('effectiveStats', () => {
  it('adds equipped bonuses on top of base stats', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'flanged-mace', quantity: 1 })
    state = equipFromSlot(state, grid(0)).state
    state = withGridStack(state, 1, { itemId: 'leather-cap', quantity: 1 })
    state = equipFromSlot(state, grid(1)).state

    const merged = effectiveStats({ strength: 3, agility: 2 }, state)

    expect(merged).toEqual({ strength: 4, agility: 3, guard: 2 })
  })

  it('never mutates the base stats object', () => {
    const base = { strength: 3 }
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'flanged-mace', quantity: 1 })
    state = equipFromSlot(state, grid(0)).state

    const merged = effectiveStats(base, state)

    expect(base).toEqual({ strength: 3 })
    expect(merged).not.toBe(base)
    expect(merged.strength).toBe(4)
  })
})

describe('countItem', () => {
  it('totals a container without counting the other one', () => {
    let state = addItem(createEmptyInventory(), 'heath-herb', 30, 'slots').state
    state = addItem(state, 'heath-herb', 5, 'hotbar').state

    expect(countItem(state, 'heath-herb')).toBe(30)
    expect(countItem(state, 'heath-herb', 'hotbar')).toBe(5)
  })
})

describe('pickUpSlot', () => {
  it('lifts the whole stack into the cursor and empties the slot', () => {
    const state = withGridStack(createEmptyInventory(), 0, { itemId: 'iron-ore', quantity: 12 })
    const held = pickUpSlot(state, grid(0))

    expect(held.slots[0]).toBeNull()
    expect(held.cursor).toEqual({ itemId: 'iron-ore', quantity: 12 })
    expect(state.slots[0]).toEqual({ itemId: 'iron-ore', quantity: 12 })
  })

  it('is a no-op when the cursor already holds a stack', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'torch', quantity: 1 })
    state = withGridStack(state, 1, { itemId: 'iron-ore', quantity: 2 })

    const held = pickUpSlot(state, grid(0))
    expect(pickUpSlot(held, grid(1))).toEqual(held)
  })

  it('ignores an empty slot', () => {
    const empty = createEmptyInventory()
    expect(pickUpSlot(empty, grid(0))).toEqual(empty)
  })
})

describe('pickUpHalf', () => {
  it('takes half rounded up and leaves the rest', () => {
    const state = withGridStack(createEmptyInventory(), 0, { itemId: 'iron-ore', quantity: 9 })
    const held = pickUpHalf(state, grid(0))

    expect(held.cursor).toEqual({ itemId: 'iron-ore', quantity: 5 })
    expect(held.slots[0]).toEqual({ itemId: 'iron-ore', quantity: 4 })
  })

  it('moves a single-item stack whole', () => {
    const state = withGridStack(createEmptyInventory(), 0, { itemId: 'torch', quantity: 1 })
    const held = pickUpHalf(state, grid(0))

    expect(held.slots[0]).toBeNull()
    expect(held.cursor).toEqual({ itemId: 'torch', quantity: 1 })
  })
})

describe('placeCursor', () => {
  it('drops the whole stack into an empty slot', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'torch', quantity: 1 })
    state = pickUpSlot(state, grid(0))
    const placed = placeCursor(state, grid(5))

    expect(placed.cursor).toBeNull()
    expect(placed.slots[5]).toEqual({ itemId: 'torch', quantity: 1 })
  })

  it('tops a same-item target up to maxStack and keeps the remainder held', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'heath-herb', quantity: 60 })
    state = withGridStack(state, 1, { itemId: 'heath-herb', quantity: 50 })
    state = pickUpSlot(state, grid(0))
    const placed = placeCursor(state, grid(1))

    expect(placed.slots[1]).toEqual({ itemId: 'heath-herb', quantity: 99 })
    expect(placed.cursor).toEqual({ itemId: 'heath-herb', quantity: 11 })
  })

  it('swaps with a different item without duplicating either', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'torch', quantity: 1 })
    state = withGridStack(state, 2, { itemId: 'iron-ore', quantity: 7 })
    state = pickUpSlot(state, grid(0))
    const placed = placeCursor(state, grid(2))

    expect(placed.slots[2]).toEqual({ itemId: 'torch', quantity: 1 })
    expect(placed.cursor).toEqual({ itemId: 'iron-ore', quantity: 7 })
  })

  it('is a no-op when the target is a full stack of the same item', () => {
    const state = withCursor(
      withGridStack(createEmptyInventory(), 1, { itemId: 'iron-ore', quantity: 99 }),
      { itemId: 'iron-ore', quantity: 5 },
    )

    expect(placeCursor(state, grid(1))).toEqual(state)
  })
})

describe('placeOne', () => {
  it('places a single unit and keeps the rest held', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'iron-ore', quantity: 8 })
    state = pickUpSlot(state, grid(0))
    const placed = placeOne(state, grid(3))

    expect(placed.slots[3]).toEqual({ itemId: 'iron-ore', quantity: 1 })
    expect(placed.cursor).toEqual({ itemId: 'iron-ore', quantity: 7 })
  })

  it('refuses a full or mismatched target', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'iron-ore', quantity: 5 })
    state = withGridStack(state, 1, { itemId: 'iron-ore', quantity: 99 })
    state = withGridStack(state, 2, { itemId: 'torch', quantity: 1 })
    const held = pickUpSlot(state, grid(0))

    expect(placeOne(held, grid(1))).toEqual(held)
    expect(placeOne(held, grid(2))).toEqual(held)
  })
})

describe('returnCursor', () => {
  it('returns the stack to the lowest free pack slot', () => {
    const state = withCursor(createEmptyInventory(), { itemId: 'torch', quantity: 1 })
    const returned = returnCursor(state)

    expect(returned.cursor).toBeNull()
    expect(returned.slots[0]).toEqual({ itemId: 'torch', quantity: 1 })
  })

  it('prefers the pack over the hotbar', () => {
    const state = withCursor(
      addItem(createEmptyInventory(), 'torch', 1, 'hotbar').state,
      { itemId: 'iron-ore', quantity: 5 },
    )
    const returned = returnCursor(state)

    expect(returned.cursor).toBeNull()
    expect(returned.slots[0]).toEqual({ itemId: 'iron-ore', quantity: 5 })
    expect(returned.hotbar[0]).toEqual({ itemId: 'torch', quantity: 1 })
  })

  it('falls back to the hotbar when the pack is full', () => {
    const state = withCursor(
      fillGrid(createEmptyInventory(), 'iron-ore', 99),
      { itemId: 'heath-herb', quantity: 5 },
    )
    const returned = returnCursor(state)

    expect(returned.cursor).toBeNull()
    expect(returned.hotbar[0]).toEqual({ itemId: 'heath-herb', quantity: 5 })
  })

  it("falls back to the item's own empty gear slot when everything is full", () => {
    let state = fillGrid(createEmptyInventory(), 'iron-ore', 99)
    state = addItem(state, 'iron-ore', 99 * state.hotbar.length, 'hotbar').state
    state = withCursor(state, { itemId: 'leather-cap', quantity: 1 })
    const returned = returnCursor(state)

    expect(returned.cursor).toBeNull()
    expect(returned.equipment.head).toEqual({ itemId: 'leather-cap', quantity: 1 })
  })

  it('keeps the stack held when pack, hotbar and gear are all occupied', () => {
    let state = fillGrid(createEmptyInventory(), 'iron-ore', 99)
    state = addItem(state, 'iron-ore', 99 * state.hotbar.length, 'hotbar').state
    state = withCursor(state, { itemId: 'heath-herb', quantity: 5 })
    const returned = returnCursor(state)

    expect(returned.cursor).toEqual({ itemId: 'heath-herb', quantity: 5 })
  })
})

/** Puts a piece of gear on directly, so drag tests do not depend on equipFromSlot. */
function withGear(state: InventoryState, slot: EquipSlot, stack: ItemStack | null): InventoryState {
  return { ...state, equipment: { ...state.equipment, [slot]: stack } }
}

describe('moveGearToSlot', () => {
  it('moves worn gear into an empty carryable slot without mutating the source', () => {
    const state = withGear(createEmptyInventory(), 'head', { itemId: 'leather-cap', quantity: 1 })
    const result = moveGearToSlot(state, 'head', grid(4))

    expect(result.ok).toBe(true)
    expect(result.state.equipment.head).toBeNull()
    expect(result.state.slots[4]).toEqual({ itemId: 'leather-cap', quantity: 1 })
    expect(state.equipment.head).toEqual({ itemId: 'leather-cap', quantity: 1 })
  })

  it('swaps with a same-slot item already in the pack', () => {
    let state = withGear(createEmptyInventory(), 'head', { itemId: 'leather-cap', quantity: 1 })
    state = withGridStack(state, 0, { itemId: 'iron-helm', quantity: 1 })

    const result = moveGearToSlot(state, 'head', grid(0))

    expect(result.ok).toBe(true)
    expect(result.state.equipment.head).toEqual({ itemId: 'iron-helm', quantity: 1 })
    expect(result.state.slots[0]).toEqual({ itemId: 'leather-cap', quantity: 1 })
    expect(result.displaced).toEqual({ itemId: 'iron-helm', quantity: 1 })
  })

  it('refuses to drop gear onto an unrelated stack', () => {
    let state = withGear(createEmptyInventory(), 'head', { itemId: 'leather-cap', quantity: 1 })
    state = withGridStack(state, 0, { itemId: 'heath-herb', quantity: 5 })

    const result = moveGearToSlot(state, 'head', grid(0))

    expect(result).toMatchObject({ ok: false, reason: 'wrong-slot' })
    expect(result.state).toEqual(state)
  })

  it('refuses an empty gear slot and an out-of-range target', () => {
    const empty = createEmptyInventory()
    expect(moveGearToSlot(empty, 'head', grid(0))).toMatchObject({
      ok: false,
      reason: 'nothing-equipped',
    })

    const geared = withGear(empty, 'head', { itemId: 'leather-cap', quantity: 1 })
    expect(moveGearToSlot(geared, 'head', grid(999))).toMatchObject({
      ok: false,
      reason: 'empty-slot',
    })
  })
})

describe('pickUpGear / equipCursor', () => {
  it('lifts worn gear out of its slot into the cursor', () => {
    const state = withGear(createEmptyInventory(), 'head', { itemId: 'leather-cap', quantity: 1 })
    const held = pickUpGear(state, 'head')

    expect(held.equipment.head).toBeNull()
    expect(held.cursor).toEqual({ itemId: 'leather-cap', quantity: 1 })
  })

  it('is a no-op while already holding or from an empty gear slot', () => {
    const empty = createEmptyInventory()
    expect(pickUpGear(empty, 'head')).toEqual(empty)

    const geared = withGear(
      withCursor(empty, { itemId: 'torch', quantity: 1 }),
      'head',
      { itemId: 'leather-cap', quantity: 1 },
    )
    expect(pickUpGear(geared, 'head')).toEqual(geared)
  })

  it('equips a matching cursor stack and holds what it displaced', () => {
    const state = withGear(
      withCursor(createEmptyInventory(), { itemId: 'iron-helm', quantity: 1 }),
      'head',
      { itemId: 'leather-cap', quantity: 1 },
    )

    const result = equipCursor(state, 'head')

    expect(result.ok).toBe(true)
    expect(result.state.equipment.head).toEqual({ itemId: 'iron-helm', quantity: 1 })
    expect(result.state.cursor).toEqual({ itemId: 'leather-cap', quantity: 1 })
  })

  it('refuses an empty cursor or a stack that belongs in another slot', () => {
    expect(equipCursor(createEmptyInventory(), 'head')).toMatchObject({
      ok: false,
      reason: 'nothing-held',
    })

    const held = withCursor(createEmptyInventory(), { itemId: 'leather-cap', quantity: 1 })
    expect(equipCursor(held, 'chest')).toMatchObject({ ok: false, reason: 'wrong-slot' })
    expect(equipCursor(held, 'chest').state).toEqual(held)
  })
})

describe('half-stack and single-unit edges', () => {
  it('splits an even stack down the middle', () => {
    const state = withGridStack(createEmptyInventory(), 0, { itemId: 'iron-ore', quantity: 2 })
    const held = pickUpHalf(state, grid(0))

    expect(held.cursor).toEqual({ itemId: 'iron-ore', quantity: 1 })
    expect(held.slots[0]).toEqual({ itemId: 'iron-ore', quantity: 1 })
  })

  it('ignores half-picking an empty slot or a slot while already holding', () => {
    const empty = createEmptyInventory()
    expect(pickUpHalf(empty, grid(0))).toEqual(empty)

    const seeded = withCursor(
      withGridStack(empty, 0, { itemId: 'iron-ore', quantity: 4 }),
      { itemId: 'torch', quantity: 1 },
    )
    expect(pickUpHalf(seeded, grid(0))).toEqual(seeded)
  })

  it('clears the cursor when the last unit is placed one at a time', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'iron-ore', quantity: 1 })
    state = pickUpSlot(state, grid(0))

    const placed = placeOne(state, grid(5))

    expect(placed.cursor).toBeNull()
    expect(placed.slots[5]).toEqual({ itemId: 'iron-ore', quantity: 1 })
  })

  it('tops a matching target up one unit at a time', () => {
    let state = withGridStack(createEmptyInventory(), 0, { itemId: 'iron-ore', quantity: 3 })
    state = withGridStack(state, 1, { itemId: 'iron-ore', quantity: 10 })
    state = pickUpSlot(state, grid(0))

    const placed = placeOne(state, grid(1))

    expect(placed.slots[1]).toEqual({ itemId: 'iron-ore', quantity: 11 })
    expect(placed.cursor).toEqual({ itemId: 'iron-ore', quantity: 2 })
  })

  it('is a no-op placing one with an empty cursor', () => {
    expect(placeOne(createEmptyInventory(), grid(0))).toEqual(createEmptyInventory())
  })
})
