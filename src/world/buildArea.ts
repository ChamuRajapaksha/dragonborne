import type Phaser from 'phaser'
import type { AreaDefinition } from './areas'
import { getAreaSize, parseAreaMap } from './areas'
import {
  COLLIDING_TILE_INDEXES,
  TILESET_KEY,
  TILE_SIZE,
  ensureTileset,
  toCssColor,
} from './tileset'

export const TERRAIN_TILESET_NAME = 'terrain'

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

  scene.add.existing(layer)
  layer.setCollision([...COLLIDING_TILE_INDEXES], true, true)

  const size = getAreaSize(area)
  scene.cameras.main.setBackgroundColor(toCssColor(area.backgroundColor))
  scene.physics.world.setBounds(0, 0, size.width, size.height)
  scene.cameras.main.setBounds(0, 0, size.width, size.height)

  return layer
}
