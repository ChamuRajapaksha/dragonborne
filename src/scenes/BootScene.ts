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
      this.gotoWorld(saved)
      return
    }

    showCreationScreen((character) => {
      this.gotoWorld(character)
    })
  }

  private gotoWorld(character: Character): void {
    this.scene.start('world', { character })
  }
}