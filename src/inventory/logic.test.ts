import { describe, expect, it } from 'vitest'
import {
  addItem,
  countItem,
  createEmptyInventory,
  effectiveStats,
  equipFromSlot,
  moveStack,
  removeItem,
  splitStack,
  unequipToSlot,
} from './logic'
import type { InventoryState, ItemStack } from './types'
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
