import Phaser from 'phaser'
import type { Character } from '../character'
import { getClassById } from '../character'
import { showIntroCard } from '../introCard'
import { showQuestPopup, closeQuestPopup } from '../questPopup'
import { getNpcById } from '../story'
import { AREAS, getAreaById, getAreaSpawn } from '../world/areas'
import type { AreaDefinition } from '../world/areas'
import type { AreaNpcMarker, AreaPortalMarker } from '../world/buildArea'
import { buildMarkers, buildPortals, buildTerrain } from '../world/buildArea'
import { loadProgress, setProgressFlag } from '../world/progress'

const NEW_CHARACTER_AREA_ID = 'forest'
const PLAYER_SPEED = 200
const DIAGONAL_FACTOR = 0.7071
const INTERACT_RANGE = 55
const PORTAL_RANGE = 26
const NPC_INTERACT_HINT = 'Press E'

function introFlagKey(areaId: string): string {
  return `intro:${areaId}`
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
  private npcMarkers: AreaNpcMarker[] = []
  private portalMarkers: AreaPortalMarker[] = []
  private popupOpen = false
  private introCardOpen = false
  private character: Character | undefined = undefined
  private areaId = NEW_CHARACTER_AREA_ID
  private spawnPx: { x: number; y: number } | null = null

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
    this.popupOpen = false
    this.introCardOpen = false
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

    this.interactHint = this.add
      .text(0, 0, NPC_INTERACT_HINT, { color: '#ffffff', backgroundColor: '#00000088', fontSize: '12px' })
      .setOrigin(0.5)
    this.interactHint.setVisible(false)
    this.interactHint.setDepth(3)

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    const characterName = this.character?.name ?? ''
    if (characterName) {
      const classInfo = getClassById(this.character?.classId ?? '')
      const className = classInfo?.name ?? 'Unknown'

      const hudBg = this.add.rectangle(0, 0, 200, 52, 0x000000, 0.5).setOrigin(0, 0)
      hudBg.setScrollFactor(0).setDepth(10)

      this.add
        .text(12, 8, characterName, {
          color: '#ffffff',
          fontSize: '16px',
          fontStyle: 'bold',
        })
        .setScrollFactor(0)
        .setDepth(11)

      this.add
        .text(12, 30, className, {
          color: '#aa3bff',
          fontSize: '12px',
        })
        .setScrollFactor(0)
        .setDepth(11)
    }

    this.maybeShowIntroCard(area)
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

  update(): void {
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

  private usePortal(portal: AreaPortalMarker): void {
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
