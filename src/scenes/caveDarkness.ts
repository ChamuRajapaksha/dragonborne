import Phaser from 'phaser'

/** How dark the cave sits away from the light; near-black, not pure black. */
export const CAVE_DARKNESS_ALPHA = 0.94

export type TorchLightState = 'none' | 'carried' | 'selected'

const LIGHT_TEXTURE_PREFIX = 'cave-light-'
const LIGHT_TEXTURE_STOPS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0.55, 0.85],
  [1, 0],
]
const LIGHT_RADII: Readonly<Record<TorchLightState, number>> = {
  none: 72,
  carried: 220,
  selected: 280,
}

export function lightRadiusFor(state: TorchLightState): number {
  return LIGHT_RADII[state]
}

function lightTextureKey(state: TorchLightState): string {
  return `${LIGHT_TEXTURE_PREFIX}${state}`
}

/**
 * Builds the soft radial mask used to punch a hole in the darkness. A white
 * centre fading to transparent edges is all the erase blend needs; there are no
 * art assets to load. Created once per scene texture manager and reused.
 */
function ensureLightTexture(scene: Phaser.Scene, state: TorchLightState): string {
  const key = lightTextureKey(state)
  if (scene.textures.exists(key)) return key

  const radius = lightRadiusFor(state)
  const size = Math.max(2, Math.ceil(radius * 2))
  const texture = scene.textures.createCanvas(key, size, size)
  if (!texture) return key

  const context = texture.context
  const centre = size / 2
  const gradient = context.createRadialGradient(centre, centre, 0, centre, centre, radius)
  for (const [offset, alpha] of LIGHT_TEXTURE_STOPS) {
    gradient.addColorStop(offset, `rgba(255, 255, 255, ${alpha})`)
  }
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  texture.refresh()

  return key
}

/**
 * Screen-space darkness over the cave with a light hole around the player.
 *
 * Phaser 4 removed the Light2D pipeline, so this is a fixed-to-camera
 * RenderTexture: fill it near-black each frame, then erase the radial light
 * texture at the player's screen position. It sits above the room dimming layer
 * and below the HUD, and is only shown while the cave is the active area.
 */
export class CaveDarkness {
  private readonly scene: Phaser.Scene
  private readonly darkness: Phaser.GameObjects.RenderTexture

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.scene = scene
    for (const state of ['none', 'carried', 'selected'] as const) {
      ensureLightTexture(scene, state)
    }

    this.darkness = scene.add
      .renderTexture(0, 0, Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)))
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(9)
      .setVisible(false)
  }

  /** Redraws the overlay at the player's position for the current torch state. */
  update(
    camera: Phaser.Cameras.Scene2D.Camera,
    playerX: number,
    playerY: number,
    state: TorchLightState,
  ): void {
    const screenX = (playerX - camera.scrollX) * camera.zoom
    const screenY = (playerY - camera.scrollY) * camera.zoom

    this.darkness.setVisible(true)
    this.darkness.clear()
    this.darkness.fill(0x000000, CAVE_DARKNESS_ALPHA)
    this.darkness.erase(ensureLightTexture(this.scene, state), screenX, screenY)
  }

  hide(): void {
    this.darkness.setVisible(false)
  }

  destroy(): void {
    this.darkness.destroy()
  }
}
