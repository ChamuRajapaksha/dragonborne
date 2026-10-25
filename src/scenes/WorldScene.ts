import Phaser from 'phaser'
import type { Character } from '../character'
import { getClassById } from '../character'
import { formatGold, getGold, subscribeGold } from '../economy'
import { showIntroCard } from '../introCard'
import { showQuestPopup, closeQuestPopup } from '../questPopup'
import { closeInventoryPanel, isInventoryPanelOpen, showInventoryPanel } from '../inventoryPanel'
import { closeTradePanel, isTradePanelOpen, showTradePanel } from '../tradePanel'
import { showSmithPanel, closeSmithPanel, isSmithPanelOpen } from '../smithPanel'
import {
  addItem,
  effectiveStats,
  getItemById,
  getInventory,
  remainingCapacity,
  removeItemEverywhere,
  subscribeInventory,
  updateInventory,
} from '../inventory'
import type { InventoryState } from '../inventory'
import { destroyHotbar, mountHotbar, renderHotbar } from '../hotbar'
import { showToast } from '../toast'
import { getNpcById } from '../story'
import { AREAS, getAreaById, getAreaSpawn, worldToTile } from '../world/areas'
import type { AreaDefinition } from '../world/areas'
import type { AreaNpcMarker, AreaItemMarker, AreaPortalMarker } from '../world/buildArea'
import { buildItems, buildMarkers, buildPortals, buildTerrain } from '../world/buildArea'
import { mineHitsRemaining, oreForTile } from '../world/ore'
import {
  chopFlagKey,
  clearChopFlag,
  loadProgress,
  mineFlagKey,
  saveProgress,
  setProgressFlag,
} from '../world/progress'
import {
  MINED_OUT_INDEX,
  STUMP_TILE_INDEX,
  TILE_SIZE,
  TREE_TRUNK_INDEX,
  chopHitsRemaining,
  isOreNodeTile,
  isStumpTile,
  isTreeTrunkTile,
} from '../world/tileset'

const NEW_CHARACTER_AREA_ID = 'forest'
const PLAYER_SPEED = 200
const DIAGONAL_FACTOR = 0.7071
const INTERACT_RANGE = 55
const PORTAL_RANGE = 26
const NPC_INTERACT_HINT = 'Press E'
const IDLE_SAVE_SECONDS = 1.5
const UNSAVED_POINT = Number.NaN
const HUD_PANEL_WIDTH = 300
const HUD_PANEL_HEIGHT = 130
const HUD_BACKGROUND_COLOR = 0x000000
const HUD_BACKGROUND_ALPHA = 0.5
const HUD_PANEL_DEPTH = 10
const HUD_TEXT_DEPTH = 11
const HUD_NAME_STYLE = { color: '#ffffff', fontSize: '16px', fontStyle: 'bold' } as const
const HUD_CLASS_STYLE = { color: '#aa3bff', fontSize: '12px' } as const
const HUD_AREA_STYLE = { color: '#cfe6b0', fontSize: '12px' } as const
const HUD_GOLD_STYLE = { color: '#ffd166', fontSize: '12px' } as const
const HUD_HINT_STYLE = { color: '#ffd27f', fontSize: '12px' } as const
const HUD_SELECTED_STYLE = { color: '#e5e5ea', fontSize: '12px' } as const
const AXE_ITEM_ID = 'axe'
const PICKAXE_ITEM_ID = 'pickaxe'
const SAPLING_ITEM_ID = 'sapling'
const WOOD_ITEM_ID = 'wood'
const WOOD_YIELD = 3
const COMPASS_POINTS = [
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
] as const
const COMPASS_SEGMENTS = COMPASS_POINTS.length

function introFlagKey(areaId: string): string {
  return `intro:${areaId}`
}

function compassDirection(dx: number, dy: number): string {
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / (COMPASS_SEGMENTS / 2)))
  const index = ((octant % COMPASS_SEGMENTS) + COMPASS_SEGMENTS) % COMPASS_SEGMENTS
  return COMPASS_POINTS[index] ?? 'east'
}

interface Waypoint {
  label: string
  x: number
  y: number
}

function resolveAreaId(requestedAreaId?: string): string {
  const candidate = requestedAreaId ?? loadProgress()?.areaId ?? ''
  return candidate in AREAS ? candidate : NEW_CHARACTER_AREA_ID
}

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key
  A: Phaser.Input.Keyboard.Key
  S: Phaser.Input.Keyboard.Key
  D: Phaser.Input.Keyboard.Key
}

/** A choppable tree trunk, located by tile so its progress can be keyed. */
interface TreeSpot {
  tileX: number
  tileY: number
  x: number
  y: number
}

/** A felled stump, located by tile so a sapling can replant it. */
interface StumpSpot {
  tileX: number
  tileY: number
  x: number
  y: number
}

/** A mineable ore node, located by tile so its progress can be keyed. */
interface OreSpot {
  tileX: number
  tileY: number
  x: number
  y: number
}

interface WorldSceneData {
  character?: Character
  areaId?: string
  spawnPx?: { x: number; y: number }
}

export default class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private playerBody!: Phaser.Physics.Arcade.Body
  private playerPoint: { x: number; y: number } = { x: 0, y: 0 }
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: WasdKeys
  private interactKey!: Phaser.Input.Keyboard.Key
  private inventoryKey!: Phaser.Input.Keyboard.Key
  private hotbarKeys: Phaser.Input.Keyboard.Key[] = []
  private interactHint!: Phaser.GameObjects.Text
  private waypointHint!: Phaser.GameObjects.Text
  private hudSelectedItem!: Phaser.GameObjects.Text
  private hudGold!: Phaser.GameObjects.Text
  private waypoint: Waypoint | null = null
  private npcMarkers: AreaNpcMarker[] = []
  private portalMarkers: AreaPortalMarker[] = []
  /** Items lying in the area, kept live so pickups can remove them. */
  private itemMarkers: AreaItemMarker[] = []
  private terrain!: Phaser.Tilemaps.TilemapLayerBase
  /** Transient hits remaining per tree tile, keyed `"x,y"`; never persisted. */
  private chopProgress = new Map<string, number>()
  /** Transient swings remaining per ore tile, keyed `"x,y"`; never persisted. */
  private mineProgress = new Map<string, number>()
  private popupOpen = false
  private introCardOpen = false
  private inventoryOpen = false
  private tradeOpen = false
  private smithOpen = false
  private unsubscribeInventory: (() => void) | null = null
  private unsubscribeGold: (() => void) | null = null
  private character: Character | undefined = undefined
  private areaId = NEW_CHARACTER_AREA_ID
  private spawnPx: { x: number; y: number } | null = null
  private idleSeconds = 0
  private savedPoint: { x: number; y: number } = { x: UNSAVED_POINT, y: UNSAVED_POINT }

  constructor() {
    super('world')
  }

  init(data: WorldSceneData): void {
    this.character = data.character
    this.areaId = resolveAreaId(data.areaId)
    this.spawnPx = data.spawnPx ?? null
    this.playerPoint = { x: 0, y: 0 }
    this.npcMarkers = []
    this.portalMarkers = []
    this.itemMarkers = []
    this.chopProgress = new Map()
    this.mineProgress = new Map()
    this.hotbarKeys = []
    this.waypoint = null
    this.popupOpen = false
    this.introCardOpen = false
    this.inventoryOpen = false
    this.tradeOpen = false
    this.smithOpen = false
    this.unsubscribeInventory = null
    this.unsubscribeGold = null
    this.idleSeconds = 0
    this.savedPoint = { x: UNSAVED_POINT, y: UNSAVED_POINT }
  }

  create(): void {
    const area = getAreaById(this.areaId)
    const spawn = this.spawnPx ?? getAreaSpawn(area)

    this.playerPoint = { x: spawn.x, y: spawn.y }

    this.terrain = buildTerrain(this, area)

    this.player = this.add.rectangle(spawn.x, spawn.y, 32, 32, 0x22cc66)
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)

    this.physics.add.collider(this.player, this.terrain)
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as WasdKeys
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    this.inventoryKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I)

    this.hotbarKeys = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
      Phaser.Input.Keyboard.KeyCodes.NINE,
    ].map((code) => this.input.keyboard!.addKey(code))

    this.npcMarkers = buildMarkers(this, area)
    this.portalMarkers = buildPortals(this, area)
    this.itemMarkers = buildItems(this, area)
    this.waypoint = this.resolveWaypoint(area)

    this.interactHint = this.add
      .text(0, 0, NPC_INTERACT_HINT, { color: '#ffffff', backgroundColor: '#00000088', fontSize: '12px' })
      .setOrigin(0.5)
    this.interactHint.setVisible(false)
    this.interactHint.setDepth(3)

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    this.buildHud(area)

    mountHotbar(getInventory())
    this.unsubscribeInventory = subscribeInventory((state) => {
      renderHotbar(state)
      this.refreshSelectedHud(state)
    })
    this.unsubscribeGold = subscribeGold((gold) => this.refreshGoldHud(gold))

    this.maybeShowIntroCard(area)

    this.events.once('shutdown', () => {
      this.saveCurrentProgress()
      this.unsubscribeInventory?.()
      this.unsubscribeInventory = null
      this.unsubscribeGold?.()
      this.unsubscribeGold = null
      destroyHotbar()
    })
  }

  private buildHud(area: AreaDefinition): void {
    this.add
      .rectangle(0, 0, HUD_PANEL_WIDTH, HUD_PANEL_HEIGHT, HUD_BACKGROUND_COLOR, HUD_BACKGROUND_ALPHA)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(HUD_PANEL_DEPTH)

    let row = 10
    const addRow = (
      content: string,
      style: Phaser.Types.GameObjects.Text.TextStyle,
    ): Phaser.GameObjects.Text => {
      const line = this.add
        .text(12, row, content, style)
        .setScrollFactor(0)
        .setDepth(HUD_TEXT_DEPTH)
      row += 20
      return line
    }

    const characterName = this.character?.name ?? ''
    if (characterName) {
      addRow(characterName, HUD_NAME_STYLE)
      addRow(getClassById(this.character?.classId ?? '')?.name ?? 'Unknown', HUD_CLASS_STYLE)
    }

    addRow(area.name, HUD_AREA_STYLE)

    this.hudGold = addRow(formatGold(getGold()), HUD_GOLD_STYLE)

    this.waypointHint = addRow('', HUD_HINT_STYLE)
    this.refreshWaypointHint()

    this.hudSelectedItem = addRow('', HUD_SELECTED_STYLE)
    this.refreshSelectedHud(getInventory())
  }

  private refreshSelectedHud(state: InventoryState): void {
    const stack = state.hotbar[state.selectedHotbarSlot]
    const item = stack ? getItemById(stack.itemId) : undefined
    const text =
      !stack || !item
        ? 'Selected: nothing'
        : `Selected: ${item.name}${stack.quantity > 1 ? ` \u00d7 ${stack.quantity}` : ''}`

    if (this.hudSelectedItem.text !== text) this.hudSelectedItem.setText(text)
  }

  private refreshGoldHud(gold: number): void {
    const text = formatGold(gold)
    if (this.hudGold.text !== text) this.hudGold.setText(text)
  }

  private resolveWaypoint(area: AreaDefinition): Waypoint | null {
    const targetAreaId = area.waypointAreaId
    if (!targetAreaId) return null

    const portal = this.portalMarkers.find((marker) => marker.toAreaId === targetAreaId)
    if (!portal) return null

    return { label: portal.toAreaName, x: portal.x, y: portal.y }
  }

  private refreshWaypointHint(): void {
    const waypoint = this.waypoint
    if (!waypoint) {
      this.waypointHint.setVisible(false)
      return
    }

    const dx = waypoint.x - this.playerPoint.x
    const dy = waypoint.y - this.playerPoint.y
    const tiles = Math.round(
      Phaser.Math.Distance.Between(this.playerPoint.x, this.playerPoint.y, waypoint.x, waypoint.y) /
        TILE_SIZE,
    )
    const text =
      tiles <= 1
        ? `${waypoint.label} is right here`
        : `${waypoint.label}: ${compassDirection(dx, dy)}, ${tiles} tiles`

    if (this.waypointHint.text !== text) this.waypointHint.setText(text)
    this.waypointHint.setVisible(true)
  }

  private maybeShowIntroCard(area: AreaDefinition): void {
    const intro = area.intro
    if (!intro) return
    if (loadProgress()?.flags[introFlagKey(area.id)]) return

    this.popupOpen = true
    this.introCardOpen = true

    showIntroCard(intro, () => {
      this.introCardOpen = false
      this.popupOpen = false
      setProgressFlag(introFlagKey(area.id), true)
    })
  }

  update(_time: number, delta: number): void {
    this.syncInventoryFlag()
    this.syncTradeFlag()
    this.syncSmithFlag()

    let vx = 0
    let vy = 0

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1

    if (this.inventoryOpen || this.tradeOpen || this.smithOpen) {
      vx = 0
      vy = 0
    }

    if (vx !== 0 && vy !== 0) {
      vx *= DIAGONAL_FACTOR
      vy *= DIAGONAL_FACTOR
    }

    this.playerBody.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED)
    this.playerPoint = { x: this.player.x, y: this.player.y }
    this.selectHotbarSlotFromKeys()
    this.trackIdleSave(delta)
    this.refreshWaypointHint()

    const portal = this.findPortalUnderfoot()
    const nearest = this.findNearestNpc()
    const nearestItem = this.findNearestItem()
    const nearestTree = this.findNearestTree()
    const nearestStump = this.findNearestStump()
    const nearestOre = this.findNearestOre()
    const nearestNpc = nearest ? getNpcById(nearest.npcId) : undefined

    const interactPressed = Phaser.Input.Keyboard.JustDown(this.interactKey)
    const inventoryPressed = Phaser.Input.Keyboard.JustDown(this.inventoryKey)

    if (inventoryPressed && (this.inventoryOpen || (!this.popupOpen && !this.introCardOpen))) {
      this.toggleInventory()
    }

    if (portal && interactPressed && !this.popupOpen) {
      this.usePortal(portal)
      return
    }

    if (portal) {
      this.showInteractHint(`Press E \u2192 ${portal.toAreaName}`, portal.x, portal.y - 30)
    } else if (nearest) {
      this.showInteractHint(NPC_INTERACT_HINT, nearest.x, nearest.y - 30)
    } else if (nearestItem) {
      const label =
        nearestItem.quantity > 1
          ? `${nearestItem.name} \u00d7 ${nearestItem.quantity}`
          : nearestItem.name
      this.showInteractHint(`Press E \u2192 ${label}`, nearestItem.x, nearestItem.y - 30)
    } else if (nearestTree) {
      const hint =
        this.selectedHotbarItemId() === AXE_ITEM_ID ? 'Press E \u2192 Chop tree' : 'Need an axe'
      this.showInteractHint(hint, nearestTree.x, nearestTree.y - 30)
    } else if (nearestStump) {
      const hint =
        this.selectedHotbarItemId() === SAPLING_ITEM_ID
          ? 'Press E \u2192 Plant sapling'
          : 'Need a sapling'
      this.showInteractHint(hint, nearestStump.x, nearestStump.y - 30)
    } else if (nearestOre) {
      const hint =
        this.selectedHotbarItemId() === PICKAXE_ITEM_ID
          ? 'Press E \u2192 Mine ore'
          : 'Need a pickaxe'
      this.showInteractHint(hint, nearestOre.x, nearestOre.y - 30)
    } else {
      this.interactHint.setVisible(false)
    }

    // The inventory sets `popupOpen` too, but walk-away must never dismiss it —
    // only the I key or the panel's own Close button does. The smith panel owns
    // its own walk-away below, because his quest popup rides on top of it.
    if (
      this.popupOpen &&
      !this.introCardOpen &&
      !this.inventoryOpen &&
      !this.tradeOpen &&
      !this.smithOpen &&
      !nearestNpc
    ) {
      closeQuestPopup()
      this.popupOpen = false
    }

    // The trade panel closes on walk-away like the quest popup, but only for
    // itself — standing at a quest NPC must not dismiss an open trade panel
    // that was somehow left open.
    if (this.tradeOpen && !nearestNpc) {
      closeTradePanel()
      this.tradeOpen = false
      this.popupOpen = false
    }

    // Walk-away closes the shop and the quest popup layered on top of it, so
    // Brennan's jobs list never outlives the visit that opened it.
    if (this.smithOpen && !nearestNpc) {
      closeSmithPanel()
      closeQuestPopup()
      this.smithOpen = false
      this.popupOpen = false
    }

    if (nearestNpc && this.character && interactPressed && !this.popupOpen) {
      if (nearestNpc.service === 'trade') {
        showTradePanel(nearestNpc)
        this.popupOpen = true
        this.tradeOpen = true
      } else if (nearestNpc.service === 'smith') {
        // Same stat snapshot reasoning as the quest popup: the pack cannot be
        // opened over the shop, so gear bonuses cannot change mid-visit.
        showSmithPanel(
          nearestNpc,
          this.character.classId,
          effectiveStats(this.character.stats, getInventory()),
        )
        this.popupOpen = true
        this.smithOpen = true
      } else {
        // Gear must be able to unlock stat-gated quests — the popup never shows
        // while the inventory is open, so this snapshot cannot go stale.
        showQuestPopup(
          nearestNpc,
          this.character.classId,
          effectiveStats(this.character.stats, getInventory()),
        )
        this.popupOpen = true
      }
    } else if (nearestItem && interactPressed && !this.popupOpen) {
      this.pickupItem(nearestItem)
    } else if (nearestTree && interactPressed && !this.popupOpen) {
      this.chopTree(nearestTree)
    } else if (nearestStump && interactPressed && !this.popupOpen) {
      this.replantStump(nearestStump)
    } else if (nearestOre && interactPressed && !this.popupOpen) {
      this.mineOre(nearestOre)
    }
  }

  /**
   * Picks the stack up into the hotbar first so the result is visible without
   * opening the panel, then into the pack. Whatever does not fit stays on the
   * ground — the marker keeps the remainder.
   */
  private pickupItem(marker: AreaItemMarker): void {
    let gained = 0
    let remainder = 0

    updateInventory((current) => {
      const intoHotbar = addItem(current, marker.itemId, marker.quantity, 'hotbar')
      const result =
        intoHotbar.remainder > 0
          ? addItem(intoHotbar.state, marker.itemId, intoHotbar.remainder, 'slots')
          : intoHotbar
      gained = marker.quantity - result.remainder
      remainder = result.remainder
      return result.state
    })

    if (remainder > 0) showToast('Your pack is full')
    if (gained <= 0) return

    marker.quantity -= gained
    // Partial pickup: the rest stays on the ground and the flag stays unset.
    if (marker.quantity > 0) return

    if (marker.flagKey) setProgressFlag(marker.flagKey)
    marker.object.destroy()
    this.itemMarkers = this.itemMarkers.filter((entry) => entry !== marker)
  }

  /**
   * The panel's Close button removes its DOM without asking the scene, so the flag
   * is reconciled against the DOM before anything reads it.
   */
  private syncInventoryFlag(): void {
    if (!this.inventoryOpen || isInventoryPanelOpen()) return
    this.inventoryOpen = false
    this.popupOpen = false
  }

  /** Same DOM-existence reconciliation as the inventory panel, for the trader. */
  private syncTradeFlag(): void {
    if (!this.tradeOpen || isTradePanelOpen()) return
    this.tradeOpen = false
    this.popupOpen = false
  }

  /** Same DOM-existence reconciliation again, for the smith — Close button. */
  private syncSmithFlag(): void {
    if (!this.smithOpen || isSmithPanelOpen()) return
    this.smithOpen = false
    this.popupOpen = false
  }

  private toggleInventory(): void {
    closeInventoryPanel()
    if (this.inventoryOpen) {
      this.inventoryOpen = false
      this.popupOpen = false
      return
    }

    showInventoryPanel(getInventory())
    this.inventoryOpen = true
    this.popupOpen = true
  }

  /** `1`–`9` select the matching hotbar slot; the store notifies the hotbar. */
  private selectHotbarSlotFromKeys(): void {
    this.hotbarKeys.forEach((key, index) => {
      if (!Phaser.Input.Keyboard.JustDown(key)) return
      if (getInventory().selectedHotbarSlot === index) return
      updateInventory((current) => ({ ...current, selectedHotbarSlot: index }))
    })
  }

  private showInteractHint(text: string, x: number, y: number): void {
    if (this.interactHint.text !== text) this.interactHint.setText(text)
    this.interactHint.setPosition(x, y)
    this.interactHint.setVisible(true)
  }

  private trackIdleSave(delta: number): void {
    if (this.playerBody.speed > 0) {
      this.idleSeconds = 0
      return
    }

    this.idleSeconds += delta / 1000
    if (this.idleSeconds >= IDLE_SAVE_SECONDS) {
      this.idleSeconds = 0
      this.saveCurrentProgress()
    }
  }

  private saveCurrentProgress(): void {
    const x = Math.round(this.playerPoint.x)
    const y = Math.round(this.playerPoint.y)
    if (x === this.savedPoint.x && y === this.savedPoint.y) return

    this.savedPoint = { x, y }
    const previous = loadProgress()
    saveProgress({
      areaId: this.areaId,
      x,
      y,
      flags: previous?.flags ?? {},
      seed: previous?.seed,
      caveSeed: previous?.caveSeed,
    })
  }

  private usePortal(portal: AreaPortalMarker): void {
    this.saveCurrentProgress()
    this.scene.restart({
      character: this.character,
      areaId: portal.toAreaId,
      spawnPx: portal.toSpawnPx,
    })
  }

  private findPortalUnderfoot(): AreaPortalMarker | null {
    let nearest: AreaPortalMarker | null = null
    let nearestDistance = PORTAL_RANGE

    for (const marker of this.portalMarkers) {
      const distance = Phaser.Math.Distance.Between(
        this.playerPoint.x,
        this.playerPoint.y,
        marker.x,
        marker.y,
      )
      if (distance <= nearestDistance) {
        nearest = marker
        nearestDistance = distance
      }
    }

    return nearest
  }

  private findNearestNpc(): AreaNpcMarker | null {
    let nearest: AreaNpcMarker | null = null
    let nearestDistance = INTERACT_RANGE

    for (const marker of this.npcMarkers) {
      const distance = Phaser.Math.Distance.Between(
        this.playerPoint.x,
        this.playerPoint.y,
        marker.x,
        marker.y,
      )
      if (distance <= nearestDistance) {
        nearest = marker
        nearestDistance = distance
      }
    }

    return nearest
  }

  private findNearestItem(): AreaItemMarker | null {
    let nearest: AreaItemMarker | null = null
    let nearestDistance = INTERACT_RANGE

    for (const marker of this.itemMarkers) {
      const distance = Phaser.Math.Distance.Between(
        this.playerPoint.x,
        this.playerPoint.y,
        marker.x,
        marker.y,
      )
      if (distance <= nearestDistance) {
        nearest = marker
        nearestDistance = distance
      }
    }

    return nearest
  }

  /** Scans the terrain tiles within reach for a choppable trunk. */
  private findNearestTree(): TreeSpot | null {
    const origin = worldToTile(this.playerPoint.x, this.playerPoint.y)
    const radius = Math.ceil(INTERACT_RANGE / TILE_SIZE)
    let nearest: TreeSpot | null = null
    let nearestDistance = INTERACT_RANGE

    for (let tileY = origin.y - radius; tileY <= origin.y + radius; tileY += 1) {
      for (let tileX = origin.x - radius; tileX <= origin.x + radius; tileX += 1) {
        const tile = this.terrain.getTileAt(tileX, tileY)
        if (!tile || !isTreeTrunkTile(tile.index)) continue

        const x = tileX * TILE_SIZE + TILE_SIZE / 2
        const y = tileY * TILE_SIZE + TILE_SIZE / 2
        const distance = Phaser.Math.Distance.Between(this.playerPoint.x, this.playerPoint.y, x, y)
        if (distance <= nearestDistance) {
          nearest = { tileX, tileY, x, y }
          nearestDistance = distance
        }
      }
    }

    return nearest
  }

  /** Scans the terrain tiles within reach for a felled stump. */
  private findNearestStump(): StumpSpot | null {
    const origin = worldToTile(this.playerPoint.x, this.playerPoint.y)
    const radius = Math.ceil(INTERACT_RANGE / TILE_SIZE)
    let nearest: StumpSpot | null = null
    let nearestDistance = INTERACT_RANGE

    for (let tileY = origin.y - radius; tileY <= origin.y + radius; tileY += 1) {
      for (let tileX = origin.x - radius; tileX <= origin.x + radius; tileX += 1) {
        const tile = this.terrain.getTileAt(tileX, tileY)
        if (!tile || !isStumpTile(tile.index)) continue

        const x = tileX * TILE_SIZE + TILE_SIZE / 2
        const y = tileY * TILE_SIZE + TILE_SIZE / 2
        const distance = Phaser.Math.Distance.Between(this.playerPoint.x, this.playerPoint.y, x, y)
        if (distance <= nearestDistance) {
          nearest = { tileX, tileY, x, y }
          nearestDistance = distance
        }
      }
    }

    return nearest
  }

  /** Scans the terrain tiles within reach for a mineable ore node. */
  private findNearestOre(): OreSpot | null {
    const origin = worldToTile(this.playerPoint.x, this.playerPoint.y)
    const radius = Math.ceil(INTERACT_RANGE / TILE_SIZE)
    let nearest: OreSpot | null = null
    let nearestDistance = INTERACT_RANGE

    for (let tileY = origin.y - radius; tileY <= origin.y + radius; tileY += 1) {
      for (let tileX = origin.x - radius; tileX <= origin.x + radius; tileX += 1) {
        const tile = this.terrain.getTileAt(tileX, tileY)
        if (!tile || !isOreNodeTile(tile.index)) continue

        const x = tileX * TILE_SIZE + TILE_SIZE / 2
        const y = tileY * TILE_SIZE + TILE_SIZE / 2
        const distance = Phaser.Math.Distance.Between(this.playerPoint.x, this.playerPoint.y, x, y)
        if (distance <= nearestDistance) {
          nearest = { tileX, tileY, x, y }
          nearestDistance = distance
        }
      }
    }

    return nearest
  }

  /**
   * Swings the selected hotbar tool at a tree. A trunk only falls to the axe, after
   * `TREE_CHOP_HITS` swings. The final swing is refused — tree held at one hit — while
   * the pack cannot take the whole yield, so chopped wood is never lost.
   */
  private chopTree(tree: TreeSpot): void {
    if (this.selectedHotbarItemId() !== AXE_ITEM_ID) return

    const key = `${tree.tileX},${tree.tileY}`
    const remaining = chopHitsRemaining(this.chopProgress.get(key))

    if (remaining > 0) {
      this.chopProgress.set(key, remaining)
      showToast(`Tree: ${remaining} more ${remaining === 1 ? 'hit' : 'hits'}`)
      return
    }

    if (!this.canHoldItem(WOOD_ITEM_ID, WOOD_YIELD)) {
      this.chopProgress.set(key, 1)
      showToast('Your pack is full')
      return
    }

    this.chopProgress.delete(key)
    this.grantItem(WOOD_ITEM_ID, WOOD_YIELD)
    this.terrain.putTileAt(STUMP_TILE_INDEX, tree.tileX, tree.tileY)
    setProgressFlag(chopFlagKey(this.areaId, tree.tileX, tree.tileY))
    showToast(`+${WOOD_YIELD} Wood Log`)
  }

  /**
   * Plants a sapling at a felled stump: consumes one from the pack or hotbar,
   * clears the chop flag so the trunk survives reloads, and restores the tile.
   * The player must have a sapling selected in the hotbar.
   */
  private replantStump(stump: StumpSpot): void {
    if (this.selectedHotbarItemId() !== SAPLING_ITEM_ID) return

    let consumed = 0
    updateInventory((current) => {
      const result = removeItemEverywhere(current, SAPLING_ITEM_ID, 1)
      consumed = result.removed
      return result.state
    })

    if (consumed <= 0) {
      showToast('Need a sapling')
      return
    }

    clearChopFlag(this.areaId, stump.tileX, stump.tileY)
    this.terrain.putTileAt(TREE_TRUNK_INDEX, stump.tileX, stump.tileY)
    showToast('Sapling planted')
  }

  /**
   * Swings the selected pickaxe at an ore node. Each vein takes its `hits`
   * swings; the final swing is refused — node held at one swing — while the pack
   * cannot take the whole yield, so ore is never lost. Depletion is permanent:
   * the tile reverts to a walkable pocket and the mine flag persists across
   * reloads. The player must have a pickaxe selected in the hotbar.
   */
  private mineOre(ore: OreSpot): void {
    if (this.selectedHotbarItemId() !== PICKAXE_ITEM_ID) return

    const definition = oreForTile(this.terrain.getTileAt(ore.tileX, ore.tileY)?.index)
    if (!definition) return

    const key = `${ore.tileX},${ore.tileY}`
    const remaining = mineHitsRemaining(this.mineProgress.get(key), definition)

    if (remaining > 0) {
      this.mineProgress.set(key, remaining)
      showToast(`Ore: ${remaining} more ${remaining === 1 ? 'swing' : 'swings'}`)
      return
    }

    if (!this.canHoldItem(definition.itemId, definition.yield)) {
      this.mineProgress.set(key, 1)
      showToast('Your pack is full')
      return
    }

    this.mineProgress.delete(key)
    this.grantItem(definition.itemId, definition.yield)
    this.terrain.putTileAt(MINED_OUT_INDEX, ore.tileX, ore.tileY)
    setProgressFlag(mineFlagKey(this.areaId, ore.tileX, ore.tileY))
    const name = getItemById(definition.itemId)?.name ?? definition.itemId
    showToast(`+${definition.yield} ${name}`)
  }

  private canHoldItem(itemId: string, quantity: number): boolean {
    const state = getInventory()
    return (
      remainingCapacity(state, itemId, 'hotbar') +
        remainingCapacity(state, itemId, 'slots') >=
      quantity
    )
  }

  /** Fills the hotbar first so the result is visible, then the pack. */
  private grantItem(itemId: string, quantity: number): void {
    updateInventory((current) => {
      const intoHotbar = addItem(current, itemId, quantity, 'hotbar')
      return intoHotbar.remainder > 0
        ? addItem(intoHotbar.state, itemId, intoHotbar.remainder, 'slots').state
        : intoHotbar.state
    })
  }

  private selectedHotbarItemId(): string | undefined {
    const state = getInventory()
    return state.hotbar[state.selectedHotbarSlot]?.itemId
  }
}
