import type Phaser from 'phaser'
import type { AreaDefinition } from './areas'
import { getAreaById, getAreaSize, parseAreaMap, tileToWorld } from './areas'
import { getNpcById } from '../story'
import { getItemById } from '../inventory'
import {
  COLLIDING_TILE_INDEXES,
  TILESET_KEY,
  TILE_SIZE,
  ensureTileset,
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
}

export function buildTerrain(
  scene: Phaser.Scene,
  area: AreaDefinition,
): Phaser.Tilemaps.TilemapLayerBase {
  ensureTileset(scene)

  const map = scene.make.tilemap({
    data: parseAreaMap(area.map),
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
  return (area.items ?? []).map((placement) => {
    const item = getItemById(placement.itemId)
    if (!item) {
      throw new Error(
        `Area '${area.id}' places unknown item '${placement.itemId}' at ${placement.x},${placement.y}`,
      )
    }

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
    }
  })
}
