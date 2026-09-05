import './style.css'
import Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import { loadCharacter } from './character'
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
  scene: [BootScene],
}

new Phaser.Game(config)

if (!loadCharacter()) {
  showCreationScreen(() => {
    // Kingdom scene (step 5) will pick up from here.
  })
}