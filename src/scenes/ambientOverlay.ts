import Phaser from 'phaser'
import type { AmbientTint } from '../world/ambient'

/**
 * A screen-space tint that carries the day/night palette. It sits above the
 * terrain and player (depth 7) but below the village room dimming, the cave
 * darkness, and the HUD, so the interface itself is never tinted.
 */
export class AmbientOverlay {
  private readonly rect: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, width: number, height: number, depth = 7) {
    this.rect = scene.add
      .rectangle(0, 0, Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)), 0xffffff, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(depth)
      .setVisible(false)
  }

  update(tint: AmbientTint): void {
    this.rect.setFillStyle(tint.color, tint.alpha)
    this.rect.setVisible(tint.alpha > 0)
  }

  hide(): void {
    this.rect.setVisible(false)
  }

  destroy(): void {
    this.rect.destroy()
  }
}
