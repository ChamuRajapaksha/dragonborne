import Phaser from 'phaser'
import { loadCharacter } from '../character'
import type { Character } from '../character'
import { showCreationScreen } from '../creationScreen'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create(): void {
    const saved = loadCharacter()
    if (saved) {
      this.gotoKingdom(saved)
      return
    }

    showCreationScreen((character) => {
      this.gotoKingdom(character)
    })
  }

  private gotoKingdom(character: Character): void {
    this.scene.start('kingdom', { character })
  }
}