import Phaser from 'phaser'
import type { Character } from '../character'
import { getClassById } from '../character'
import { showQuestPopup, closeQuestPopup } from '../questPopup'
import { getAreaById, getAreaSpawn } from '../world/areas'
import type { AreaNpcMarker } from '../world/buildArea'
import { buildMarkers, buildTerrain } from '../world/buildArea'

const CURRENT_AREA_ID = 'village'
const PLAYER_SPEED = 200
const DIAGONAL_FACTOR = 0.7071
const INTERACT_RANGE = 55

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key
  A: Phaser.Input.Keyboard.Key
  S: Phaser.Input.Keyboard.Key
  D: Phaser.Input.Keyboard.Key
}

export default class WorldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private playerBody!: Phaser.Physics.Arcade.Body
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: WasdKeys
  private interactKey!: Phaser.Input.Keyboard.Key
  private interactHint!: Phaser.GameObjects.Text
  private npcMarkers: AreaNpcMarker[] = []
  private popupOpen = false
  private characterId = ''
  private characterClassId = ''
  private characterName = ''
  private characterStats: Record<string, number> = {}

  constructor() {
    super('world')
  }

  init(data: { character?: Character }): void {
    this.characterId = data.character?.id ?? ''
    this.characterClassId = data.character?.classId ?? ''
    this.characterName = data.character?.name ?? ''
    this.characterStats = data.character?.stats ?? {}
  }

  create(): void {
    const area = getAreaById(CURRENT_AREA_ID)
    const spawn = getAreaSpawn(area)

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

    this.interactHint = this.add
      .text(0, 0, 'Press E', { color: '#ffffff', backgroundColor: '#00000088', fontSize: '12px' })
      .setOrigin(0.5)
    this.interactHint.setVisible(false)
    this.interactHint.setDepth(3)

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    if (this.characterName) {
      const classInfo = getClassById(this.characterClassId)
      const className = classInfo?.name ?? 'Unknown'

      const hudBg = this.add.rectangle(0, 0, 200, 52, 0x000000, 0.5).setOrigin(0, 0)
      hudBg.setScrollFactor(0).setDepth(10)

      this.add
        .text(12, 8, this.characterName, {
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

    const nearest = this.findNearestNpc()

    this.interactHint.setVisible(nearest !== null)
    if (nearest) this.interactHint.setPosition(nearest.x, nearest.y - 30)

    if (this.popupOpen && !nearest) {
      closeQuestPopup()
      this.popupOpen = false
    }

    if (
      nearest &&
      this.characterId &&
      this.characterClassId &&
      Phaser.Input.Keyboard.JustDown(this.interactKey) &&
      !this.popupOpen
    ) {
      showQuestPopup(this.characterClassId, this.characterStats)
      this.popupOpen = true
    }
  }

  private findNearestNpc(): AreaNpcMarker | null {
    let nearest: AreaNpcMarker | null = null
    let nearestDistance = INTERACT_RANGE

    for (const marker of this.npcMarkers) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
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