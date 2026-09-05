import './style.css'
import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import KingdomScene from './scenes/KingdomScene'
import { loadCharacter } from './character'
import type { Character } from './character'
import { showCreationScreen } from './creationScreen'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d1d28',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, KingdomScene],
}

const game = new Phaser.Game(config)

if (!loadCharacter()) {
  showCreationScreen((character: Character) => {
    game.scene.start('kingdom', { character })
  })
}