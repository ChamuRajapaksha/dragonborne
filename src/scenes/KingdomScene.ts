import Phaser from 'phaser'
import type { Character } from '../character'
import { showQuestPopup, closeQuestPopup } from '../questPopup'

const WORLD_WIDTH = 1600
const WORLD_HEIGHT = 1200
const PLAYER_SPEED = 200
const DIAGONAL_FACTOR = 0.7071
const INTERACT_RANGE = 55
const NPC_X = 900
const NPC_Y = 600

interface WasdKeys {
  W: Phaser.Input.Keyboard.Key
  A: Phaser.Input.Keyboard.Key
  S: Phaser.Input.Keyboard.Key
  D: Phaser.Input.Keyboard.Key
}

export default class KingdomScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private playerBody!: Phaser.Physics.Arcade.Body
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: WasdKeys
  private interactKey!: Phaser.Input.Keyboard.Key
  private interactHint!: Phaser.GameObjects.Text
  private popupOpen = false
  private characterId = ''
  private characterClassId = ''
  private characterName = ''

  constructor() {
    super('kingdom')
  }

  init(data: { character?: Character }): void {
    this.characterId = data.character?.id ?? ''
    this.characterClassId = data.character?.classId ?? ''
    this.characterName = data.character?.name ?? ''
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2c3e2c')
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x3a5a3a)

    const buildings: Phaser.GameObjects.Rectangle[] = []
    const addBuilding = (x: number, y: number, w: number, h: number, color: number) => {
      const building = this.add.rectangle(x, y, w, h, color).setStrokeStyle(2, 0x1c2a1c)
      this.physics.add.existing(building, true)
      buildings.push(building)
    }

    addBuilding(800, 600, 160, 90, 0x8a6f4d)
    addBuilding(320, 320, 90, 70, 0x6f5a3d)
    addBuilding(1280, 280, 110, 70, 0x6f5a3d)
    addBuilding(260, 940, 90, 70, 0x7a6446)
    addBuilding(1380, 900, 110, 70, 0x7a6446)
    addBuilding(940, 340, 70, 60, 0x5d4a30)

    this.player = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 32, 32, 0x22cc66)
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)

    this.physics.add.collider(this.player, buildings)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as WasdKeys
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    this.add.rectangle(900, 600, 28, 28, 0xccbb55).setStrokeStyle(2, 0x221c0f)
    const npcLabel = this.add
      .text(900, 610, 'Questmaster', { color: '#ffd27f', fontSize: '12px' })
      .setOrigin(0.5, 0)
    npcLabel.setDepth(1)

    this.interactHint = this.add
      .text(900, 530, 'Press E', { color: '#ffffff', backgroundColor: '#00000088', fontSize: '12px' })
      .setOrigin(0.5)
    this.interactHint.setVisible(false)
    this.interactHint.setDepth(2)

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    if (this.characterName) {
      this.add
        .text(16, 16, `Exploring as ${this.characterName}`, {
          color: '#ffffff',
          fontSize: '16px',
        })
        .setScrollFactor(0)
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

    const inRange =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, NPC_X, NPC_Y) <=
      INTERACT_RANGE
    this.interactHint.setVisible(inRange)

    if (this.popupOpen && !inRange) {
      closeQuestPopup()
      this.popupOpen = false
    }

    if (
      inRange &&
      this.characterId &&
      this.characterClassId &&
      Phaser.Input.Keyboard.JustDown(this.interactKey) &&
      !this.popupOpen
    ) {
      showQuestPopup(this.characterClassId)
      this.popupOpen = true
    }
  }
}