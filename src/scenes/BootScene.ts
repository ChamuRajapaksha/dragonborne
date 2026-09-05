import Phaser from 'phaser'

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create(): void {
    this.add.text(16, 16, 'DragonBorne — boot scene', {
      fontSize: '20px',
      color: '#ffffff',
    })
  }
}