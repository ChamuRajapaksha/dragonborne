import Phaser from 'phaser'
import { loadCharacter } from '../character'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create(): void {
    const saved = loadCharacter()
    if (saved) {
      this.scene.start('kingdom', { character: saved })
    }
  }
}