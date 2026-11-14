import Phaser from 'phaser'
import type { WeatherKind } from '../world/weather'
import { WEATHER } from '../world/weather'

const DROP_TEXTURE_KEY = 'weather-drop'
const RAIN_DROP_COUNT = 120
const STORM_DROP_COUNT = 160
const DROP_WIDTH = 2
const DROP_HEIGHT = 12
const LIGHT_SPEED = 520
const HEAVY_SPEED = 820
const FLASH_MIN_MS = 4000
const FLASH_MAX_MS = 9000
const FLASH_DURATION_MS = 140

interface Drop {
  image: Phaser.GameObjects.Image
  speed: number
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** The 2×12 white streak every rain drop uses; generated, never loaded. */
function ensureDropTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(DROP_TEXTURE_KEY)) return DROP_TEXTURE_KEY

  const texture = scene.textures.createCanvas(DROP_TEXTURE_KEY, DROP_WIDTH, DROP_HEIGHT)
  if (!texture) return DROP_TEXTURE_KEY

  texture.context.fillStyle = 'rgba(255, 255, 255, 1)'
  texture.context.fillRect(0, 0, DROP_WIDTH, DROP_HEIGHT)
  texture.refresh()
  return DROP_TEXTURE_KEY
}

/**
 * Screen-space weather: a tint/fog wash, a pool of falling rain streaks, and a
 * storm flash. Plain rectangles and a generated canvas texture only — no
 * particle API, no custom pipeline, both of which are risky on Phaser 4.
 */
export class WeatherLayer {
  private readonly tint: Phaser.GameObjects.Rectangle
  private readonly flash: Phaser.GameObjects.Rectangle
  private readonly drops: Drop[] = []
  private readonly width: number
  private readonly height: number
  private kind: WeatherKind = 'clear'
  private dropCount = 0
  private hidden = true
  private flashTimer = 0
  private flashRemaining = 0

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.width = Math.max(1, Math.ceil(width))
    this.height = Math.max(1, Math.ceil(height))

    this.tint = scene.add
      .rectangle(0, 0, this.width, this.height, 0xffffff, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(8.5)
      .setVisible(false)

    const texture = ensureDropTexture(scene)
    for (let i = 0; i < STORM_DROP_COUNT; i += 1) {
      const image = scene.add
        .image(
          Math.random() * this.width,
          Math.random() * this.height,
          texture,
        )
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(9.05)
        .setAlpha(0.55)
        .setTint(0xbfd8ff)
        .setVisible(false)
      this.drops.push({ image, speed: randomBetween(LIGHT_SPEED * 0.85, LIGHT_SPEED * 1.2) })
    }

    this.flash = scene.add
      .rectangle(0, 0, this.width, this.height, 0xdfe9ff, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(9.2)
      .setVisible(false)
  }

  /** Applies a weather kind. Safe to call when re-emerging outdoors. */
  setWeather(kind: WeatherKind): void {
    const changed = this.kind !== kind
    this.kind = kind
    this.hidden = false

    const info = WEATHER[kind]
    this.tint.setFillStyle(info.tint.color, info.tint.alpha).setVisible(info.tint.alpha > 0)

    this.dropCount =
      info.drops === 'heavy' ? STORM_DROP_COUNT : info.drops === 'light' ? RAIN_DROP_COUNT : 0

    for (let i = 0; i < this.drops.length; i += 1) {
      this.drops[i]?.image.setVisible(i < this.dropCount)
    }

    if (changed && info.flashes) {
      this.flashTimer = randomBetween(FLASH_MIN_MS, FLASH_MAX_MS)
    }
    if (!info.flashes) {
      this.flashTimer = 0
      this.flashRemaining = 0
      this.flash.setVisible(false)
    }
  }

  update(delta: number): void {
    if (this.hidden) return

    const seconds = Math.max(0, delta) / 1000
    const speedScale = WEATHER[this.kind].drops === 'heavy' ? HEAVY_SPEED / LIGHT_SPEED : 1

    for (let i = 0; i < this.dropCount; i += 1) {
      const drop = this.drops[i]
      if (!drop) break
      let y = drop.image.y + drop.speed * speedScale * seconds
      if (y > this.height + DROP_HEIGHT) {
        y = -DROP_HEIGHT - Math.random() * 40
        drop.image.x = Math.random() * this.width
      }
      drop.image.y = y
    }

    this.updateFlash(delta)
  }

  private updateFlash(delta: number): void {
    if (WEATHER[this.kind].flashes) {
      this.flashTimer -= delta
      if (this.flashTimer <= 0) {
        this.flashRemaining = FLASH_DURATION_MS
        this.flashTimer = randomBetween(FLASH_MIN_MS, FLASH_MAX_MS)
      }
    }

    if (this.flashRemaining > 0) {
      this.flashRemaining -= delta
      const alpha = (0.55 * Math.max(0, this.flashRemaining)) / FLASH_DURATION_MS
      this.flash.setAlpha(alpha).setVisible(alpha > 0)
    } else {
      this.flash.setVisible(false)
    }
  }

  hide(): void {
    this.hidden = true
    this.tint.setVisible(false)
    this.flash.setVisible(false)
    for (const drop of this.drops) drop.image.setVisible(false)
  }

  destroy(): void {
    this.tint.destroy()
    this.flash.destroy()
    for (const drop of this.drops) drop.image.destroy()
    this.drops.length = 0
  }
}
