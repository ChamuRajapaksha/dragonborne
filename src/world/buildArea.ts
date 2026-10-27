import type Phaser from 'phaser'
import type { AreaDefinition } from './areas'
import { getAreaById, getAreaSize, parseAreaMap, resolveAreaRows, tileToWorld } from './areas'
import { getNpcById } from '../story'
import { getItemById } from '../inventory'
import { chopFlagKey, getProgressFlag, mineFlagKey, pickupFlagKey } from './progress'
import {
  COLLIDING_TILE_INDEXES,
  MINED_OUT_INDEX,
  STUMP_TILE_INDEX,
  TILESET_KEY,
  TILE_SIZE,
  TREE_TRUNK_INDEX,
  ensureTileset,
  isOreNodeTile,
  toCssColor,
} from './tileset'

export const TERRAIN_TILESET_NAME = 'terrain'

export interface AreaNpcMarker {
  npcId: string
  name: string
  x: number
  y: number
}

export interface AreaPortalMarker {
  toAreaId: string
  toAreaName: string
  toSpawnPx: { x: number; y: number }
  label: string
  x: number
  y: number
}

export interface AreaItemMarker {
  itemId: string
  name: string
  /** Units still lying on the ground; decremented by partial pickups. */
  quantity: number
  x: number // px
  y: number // px
  /** The rendered placeholder, so a pickup can take it off the map. */
  object: Phaser.GameObjects.Rectangle
  /** Progress flag to record once the stack is fully collected; null = respawns. */
  flagKey: string | null
}

export interface AreaChestMarker {
  chestId: string
  /** Items to give when opened */
  loot: readonly { itemId: string; quantity?: number }[]
  x: number // px
  y: number // px
  /** The rendered placeholder, so opening removes it. */
  object: Phaser.GameObjects.Rectangle
  /** Progress flag to record once opened; null = respawns. */
  flagKey: string | null
}

export function buildTerrain(
  scene: Phaser.Scene,
  area: AreaDefinition,
): Phaser.Tilemaps.TilemapLayerBase {
  ensureTileset(scene)

  const data = parseAreaMap(resolveAreaRows(area))
  const map = scene.make.tilemap({
    data,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
  })

  const tileset = map.addTilesetImage(
    TERRAIN_TILESET_NAME,
    TILESET_KEY,
    TILE_SIZE,
    TILE_SIZE,
  )
  if (!tileset) {
    throw new Error(`Could not attach tileset '${TILESET_KEY}' for area '${area.id}'`)
  }

  const layer = map.createLayer(0, tileset, 0, 0)
  if (!layer) {
    throw new Error(`Could not create terrain layer for area '${area.id}'`)
  }

  layer.setCollision([...COLLIDING_TILE_INDEXES], true, true)

  // Trees felled in a previous session come back as stumps, and ore nodes
  // mined out come back as walkable pockets, so the map reads identically to
  // the live `putTileAt` changes made when chopping or mining.
  for (let y = 0; y < data.length; y += 1) {
    const row = data[y]
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === TREE_TRUNK_INDEX) {
        if (getProgressFlag(chopFlagKey(area.id, x, y))) {
          layer.putTileAt(STUMP_TILE_INDEX, x, y)
        }
      } else if (isOreNodeTile(row[x])) {
        if (getProgressFlag(mineFlagKey(area.id, x, y))) {
          layer.putTileAt(MINED_OUT_INDEX, x, y)
        }
      }
    }
  }

  const size = getAreaSize(area)
  scene.cameras.main.setBackgroundColor(toCssColor(area.backgroundColor))
  scene.physics.world.setBounds(0, 0, size.width, size.height)
  scene.cameras.main.setBounds(0, 0, size.width, size.height)

  return layer
}

export function buildMarkers(
  scene: Phaser.Scene,
  area: AreaDefinition,
): AreaNpcMarker[] {
  return area.npcs.flatMap((placement) => {
    const npc = getNpcById(placement.npcId)
    if (!npc) {
      throw new Error(
        `Area '${area.id}' places unknown npc '${placement.npcId}' at ${placement.x},${placement.y}`,
      )
    }

    const { x, y } = tileToWorld(placement)

    scene.add
      .rectangle(x, y, 28, 28, 0xccbb55)
      .setStrokeStyle(2, 0x221c0f)
      .setDepth(1)

    scene.add
      .text(x, y + 14, npc.name, { color: '#ffd27f', fontSize: '12px' })
      .setOrigin(0.5, 0)
      .setDepth(2)

    return [{ npcId: npc.id, name: npc.name, x, y }]
  })
}

export function buildPortals(
  scene: Phaser.Scene,
  area: AreaDefinition,
): AreaPortalMarker[] {
  return area.portals.map((portal) => {
    const destination = getAreaById(portal.toAreaId)

    const { x, y } = tileToWorld(portal)

    scene.add
      .rectangle(x, y, 32, 32, 0x7a4fd6, 0.4)
      .setStrokeStyle(2, 0xd9c6ff)
      .setDepth(1)

    scene.add
      .text(x, y + 16, portal.label, { color: '#d9c6ff', fontSize: '12px' })
      .setOrigin(0.5, 0)
      .setDepth(2)

    return {
      toAreaId: destination.id,
      toAreaName: destination.name,
      toSpawnPx: tileToWorld(portal.toSpawn),
      label: portal.label,
      x,
      y,
    }
  })
}

/**
 * Renders every item lying in the area as a one-tile placeholder in the item's
 * own colour. Unknown item ids throw at `create()` time, same philosophy as an
 * unknown npc id in `buildMarkers`.
 */
export function buildItems(
  scene: Phaser.Scene,
  area: AreaDefinition,
): AreaItemMarker[] {
  return (area.items ?? []).flatMap((placement) => {
    const item = getItemById(placement.itemId)
    if (!item) {
      throw new Error(
        `Area '${area.id}' places unknown item '${placement.itemId}' at ${placement.x},${placement.y}`,
      )
    }

    const flagKey = placement.onceFlag
      ? pickupFlagKey(area.id, placement.itemId, placement.x, placement.y)
      : null
    if (flagKey && getProgressFlag(flagKey)) return []

    const { x, y } = tileToWorld(placement)

    const object = scene.add
      .rectangle(x, y, 16, 16, item.icon.color)
      .setStrokeStyle(2, 0x221c0f)
      .setDepth(1)

    return {
      itemId: item.id,
      name: item.name,
      quantity: placement.quantity ?? 1,
      x,
      y,
      object,
      flagKey,
    }
  })
}

export function buildChests(
  scene: Phaser.Scene,
  area: AreaDefinition,
): AreaChestMarker[] {
  return (area.chests ?? []).flatMap((placement) => {
    for (const loot of placement.loot) {
      const item = getItemById(loot.itemId)
      if (!item) {
        throw new Error(
          `Area '${area.id}' chest '${placement.chestId}' places unknown item '${loot.itemId}'`,
        )
      }
    }

    const flagKey = placement.onceFlag ? `chest:${area.id}:${placement.chestId}` : null
    if (flagKey && getProgressFlag(flagKey)) return []

    const { x, y } = tileToWorld(placement)

    const object = scene.add
      .rectangle(x, y, 18, 18, 0x8b4513)
      .setStrokeStyle(2, 0x4a2c17)
      .setDepth(1)

    return {
      chestId: placement.chestId,
      loot: placement.loot,
      x,
      y,
      object,
      flagKey,
    }
  })
}
