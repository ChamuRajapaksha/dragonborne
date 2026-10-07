import Phaser from 'phaser'
import { loadCharacter } from '../character'
import type { Character } from '../character'
import { showCreationScreen } from '../creationScreen'
import { hydrateInventory } from '../inventory'
import { AREAS } from '../world/areas'
import { loadProgress } from '../world/progress'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create(): void {
    hydrateInventory()
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
    const progress = loadProgress()
    const resumable = progress && progress.areaId in AREAS ? progress : null

    this.scene.start('world', {
      character,
      areaId: resumable?.areaId,
      spawnPx: resumable ? { x: resumable.x, y: resumable.y } : undefined,
    })
  }
}
