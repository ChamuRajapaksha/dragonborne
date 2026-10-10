import { describe, expect, it } from 'vitest'
import { migrateInventory } from './storage'
import { HOTBAR_SLOT_COUNT, INVENTORY_SLOT_COUNT } from './types'

/** A full container of identical, maxed-out stacks, used to exhaust a save. */
function full(length: number): { itemId: string; quantity: number }[] {
  return Array.from({ length }, () => ({ itemId: 'iron-ore', quantity: 99 }))
}

describe('migrateInventory', () => {
  it('rejects anything that is not a record', () => {
    expect(migrateInventory(null)).toBeNull()
    expect(migrateInventory([])).toBeNull()
    expect(migrateInventory('a save')).toBeNull()
    expect(migrateInventory(42)).toBeNull()
  })

  it('rejects a save from a future schema version', () => {
    expect(migrateInventory({ version: 3 })).toBeNull()
    expect(migrateInventory({ version: 99, slots: [] })).toBeNull()
  })

  it('reads a v1 save forward with no cursor and normalised arrays', () => {
    const migrated = migrateInventory({
      version: 1,
      hotbar: [{ itemId: 'torch', quantity: 1 }],
    })

    expect(migrated?.version).toBe(2)
    expect(migrated?.cursor).toBeNull()
    expect(migrated?.slots).toHaveLength(INVENTORY_SLOT_COUNT)
    expect(migrated?.hotbar).toHaveLength(HOTBAR_SLOT_COUNT)
    expect(migrated?.hotbar[0]).toEqual({ itemId: 'torch', quantity: 1 })
    expect(migrated?.slots.every((slot) => slot === null)).toBe(true)
  })

  it('drops unknown ids and malformed stacks rather than carrying them forward', () => {
    const migrated = migrateInventory({
      version: 2,
      slots: [
        { itemId: 'heath-herb', quantity: 5 },
        { itemId: 'not-in-catalog', quantity: 3 },
        { itemId: 'iron-ore', quantity: 0 },
        { itemId: 'iron-ore', quantity: 2.5 },
        { itemId: 'iron-ore', quantity: 'many' },
        null,
      ],
    })

    expect(migrated?.slots[0]).toEqual({ itemId: 'heath-herb', quantity: 5 })
    expect(migrated?.slots.slice(1).every((slot) => slot === null)).toBe(true)
  })

  it('clamps a stack down to the item maxStack', () => {
    const migrated = migrateInventory({ version: 2, slots: [{ itemId: 'torch', quantity: 5 }] })
    expect(migrated?.slots[0]).toEqual({ itemId: 'torch', quantity: 1 })
  })

  it('discards gear that sits in a slot it does not declare', () => {
    const migrated = migrateInventory({
      version: 2,
      equipment: {
        head: { itemId: 'leather-cap', quantity: 1 },
        chest: { itemId: 'leather-cap', quantity: 1 },
        legs: { itemId: 'heath-herb', quantity: 3 },
        mainhand: { itemId: 'worn-dagger', quantity: 1 },
      },
    })

    expect(migrated?.equipment.head).toEqual({ itemId: 'leather-cap', quantity: 1 })
    expect(migrated?.equipment.chest).toBeNull()
    expect(migrated?.equipment.legs).toBeNull()
    expect(migrated?.equipment.mainhand).toEqual({ itemId: 'worn-dagger', quantity: 1 })
  })

  it('keeps a valid hotbar selection and resets anything out of range', () => {
    expect(migrateInventory({ version: 2, selectedHotbarSlot: 4 })?.selectedHotbarSlot).toBe(4)
    expect(migrateInventory({ version: 2, selectedHotbarSlot: 9 })?.selectedHotbarSlot).toBe(0)
    expect(migrateInventory({ version: 2, selectedHotbarSlot: -1 })?.selectedHotbarSlot).toBe(0)
    expect(migrateInventory({ version: 2, selectedHotbarSlot: 1.5 })?.selectedHotbarSlot).toBe(0)
  })

  it('parks a held cursor into the pack on load', () => {
    const migrated = migrateInventory({
      version: 1,
      cursor: { itemId: 'heath-herb', quantity: 7 },
    })

    expect(migrated?.cursor).toBeNull()
    expect(migrated?.slots[0]).toEqual({ itemId: 'heath-herb', quantity: 7 })
  })

  it('tops up a matching partial stack when parking the cursor', () => {
    const migrated = migrateInventory({
      version: 2,
      slots: [{ itemId: 'heath-herb', quantity: 40 }],
      cursor: { itemId: 'heath-herb', quantity: 30 },
    })

    expect(migrated?.cursor).toBeNull()
    expect(migrated?.slots[0]).toEqual({ itemId: 'heath-herb', quantity: 70 })
  })

  it('parks a held cursor into the hotbar when the pack is full', () => {
    const migrated = migrateInventory({
      version: 2,
      slots: full(INVENTORY_SLOT_COUNT),
      cursor: { itemId: 'heath-herb', quantity: 5 },
    })

    expect(migrated?.cursor).toBeNull()
    expect(migrated?.hotbar[0]).toEqual({ itemId: 'heath-herb', quantity: 5 })
  })

  it('keeps a held cursor when the pack and hotbar are both full', () => {
    const migrated = migrateInventory({
      version: 2,
      slots: full(INVENTORY_SLOT_COUNT),
      hotbar: full(HOTBAR_SLOT_COUNT),
      cursor: { itemId: 'heath-herb', quantity: 5 },
    })

    expect(migrated?.cursor).toEqual({ itemId: 'heath-herb', quantity: 5 })
  })

  it('drops a cursor whose item has left the catalog', () => {
    const migrated = migrateInventory({
      version: 2,
      cursor: { itemId: 'ghost-item', quantity: 1 },
    })

    expect(migrated?.cursor).toBeNull()
  })
})
