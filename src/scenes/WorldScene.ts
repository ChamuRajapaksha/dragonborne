import Phaser from 'phaser'
import type { Character } from '../character'
import { getClassById } from '../character'
import { showIntroCard } from '../introCard'
import { showQuestPopup, closeQuestPopup } from '../questPopup'
import { getInventory, subscribeInventory } from '../inventory'
import { destroyHotbar, mountHotbar, renderHotbar } from '../hotbar'
import { getNpcById } from '../story'
import { AREAS, getAreaById, getAreaSpawn } from '../world/areas'
import type { AreaDefinition } from '../world/areas'
import type { AreaNpcMarker, AreaPortalMarker } from '../world/buildArea'
import { buildMarkers, buildPortals, buildTerrain } from '../world/buildArea'
import { loadProgress, saveProgress, setProgressFlag } from '../world/progress'
import { TILE_SIZE } from '../world/tileset'

const NEW_CHARACTER_AREA_ID = 'forest'
const PLAYER_SPEED = 200
const DIAGONAL_FACTOR = 0.7071
const INTERACT_RANGE = 55
const PORTAL_RANGE = 26
const NPC_INTERACT_HINT = 'Press E'
const IDLE_SAVE_SECONDS = 1.5
const UNSAVED_POINT = Number.NaN
const HUD_PANEL_WIDTH = 300
const HUD_PANEL_HEIGHT = 86
const HUD_BACKGROUND_COLOR = 0x000000
const HUD_BACKGROUND_ALPHA = 0.5
const HUD_PANEL_DEPTH = 10
const HUD_TEXT_DEPTH = 11
const HUD_NAME_STYLE = { color: '#ffffff', fontSize: '16px', fontStyle: 'bold' } as const
const HUD_CLASS_STYLE = { color: '#aa3bff', fontSize: '12px' } as const
const HUD_AREA_STYLE = { color: '#cfe6b0', fontSize: '12px' } as const
const HUD_HINT_STYLE = { color: '#ffd27f', fontSize: '12px' } as const
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
  private interactHint!: Phaser.GameObjects.Text
  private waypointHint!: Phaser.GameObjects.Text
  private waypoint: Waypoint | null = null
  private npcMarkers: AreaNpcMarker[] = []
  private portalMarkers: AreaPortalMarker[] = []
  private popupOpen = false
  private introCardOpen = false
  private unsubscribeInventory: (() => void) | null = null
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
    this.waypoint = null
    this.popupOpen = false
    this.introCardOpen = false
    this.unsubscribeInventory = null
    this.idleSeconds = 0
    this.savedPoint = { x: UNSAVED_POINT, y: UNSAVED_POINT }
  }

  create(): void {
    const area = getAreaById(this.areaId)
    const spawn = this.spawnPx ?? getAreaSpawn(area)

    this.playerPoint = { x: spawn.x, y: spawn.y }

    const terrain = buildTerrain(this, area)

    this.player = this.add.rectangle(spawn.x, spawn.y, 32, 32, 0x22cc66)
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)

    this.physics.add.collider(this.player, terrain)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as WasdKeys
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    this.npcMarkers = buildMarkers(this, area)
    this.portalMarkers = buildPortals(this, area)
    this.waypoint = this.resolveWaypoint(area)

    this.interactHint = this.add
      .text(0, 0, NPC_INTERACT_HINT, { color: '#ffffff', backgroundColor: '#00000088', fontSize: '12px' })
      .setOrigin(0.5)
    this.interactHint.setVisible(false)
    this.interactHint.setDepth(3)

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    this.buildHud(area)

    mountHotbar(getInventory())
    this.unsubscribeInventory = subscribeInventory((state) => renderHotbar(state))

    this.maybeShowIntroCard(area)

    this.events.once('shutdown', () => {
      this.saveCurrentProgress()
      this.unsubscribeInventory?.()
      this.unsubscribeInventory = null
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

    this.waypointHint = addRow('', HUD_HINT_STYLE)
    this.refreshWaypointHint()
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
    let vx = 0
    let vy = 0

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1

    if (vx !== 0 && vy !== 0) {
      vx *= DIAGONAL_FACTOR
      vy *= DIAGONAL_FACTOR
    }

    this.playerBody.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED)
    this.playerPoint = { x: this.player.x, y: this.player.y }
    this.trackIdleSave(delta)
    this.refreshWaypointHint()

    const portal = this.findPortalUnderfoot()
    const nearest = this.findNearestNpc()
    const nearestNpc = nearest ? getNpcById(nearest.npcId) : undefined

    const interactPressed = Phaser.Input.Keyboard.JustDown(this.interactKey)

    if (portal && interactPressed && !this.popupOpen) {
      this.usePortal(portal)
      return
    }

    if (portal) {
      this.showInteractHint(`Press E \u2192 ${portal.toAreaName}`, portal.x, portal.y - 30)
    } else if (nearest) {
      this.showInteractHint(NPC_INTERACT_HINT, nearest.x, nearest.y - 30)
    } else {
      this.interactHint.setVisible(false)
    }

    if (this.popupOpen && !this.introCardOpen && !nearestNpc) {
      closeQuestPopup()
      this.popupOpen = false
    }

    if (nearestNpc && this.character && interactPressed && !this.popupOpen) {
      showQuestPopup(nearestNpc, this.character.classId, this.character.stats)
      this.popupOpen = true
    }
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
    saveProgress({
      areaId: this.areaId,
      x,
      y,
      flags: loadProgress()?.flags ?? {},
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
}
