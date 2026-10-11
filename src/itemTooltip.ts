import { createItemIcon } from './itemIcon'
import type { ItemTooltipModel } from './itemTooltipModel'

const TOOLTIP_ID = 'item-tooltip'
const GAP = 8
const VIEWPORT_PADDING = 8

/**
 * A body-level, cursor-free tooltip for a hovered inventory slot. One element is
 * shared by the pack panel and the bottom hotbar; it is appended last each time so
 * it paints on top (this codebase uses no `z-index`), and `pointer-events: none` keeps
 * it from ever swallowing a click meant for a slot or the held-stack cursor.
 */
export function isItemTooltipVisible(): boolean {
  return document.getElementById(TOOLTIP_ID) !== null
}

/** Removes the tooltip. Safe to call when none is visible. */
export function hideItemTooltip(): void {
  document.getElementById(TOOLTIP_ID)?.remove()
}

/** Renders the tooltip for an item and appends it to the end of the body. */
export function showItemTooltip(model: ItemTooltipModel, itemId: string): void {
  hideItemTooltip()

  const tooltip = document.createElement('div')
  tooltip.id = TOOLTIP_ID
  tooltip.className = 'item-tooltip'

  const header = document.createElement('div')
  header.className = 'item-tooltip-header'
  header.appendChild(createItemIcon(itemId))

  const titles = document.createElement('div')
  titles.className = 'item-tooltip-titles'

  const name = document.createElement('div')
  name.className = 'item-tooltip-name'
  name.textContent = model.name
  titles.appendChild(name)

  const subtitle = document.createElement('div')
  subtitle.className = 'item-tooltip-subtitle'
  subtitle.textContent = model.subtitle
  titles.appendChild(subtitle)

  header.appendChild(titles)
  tooltip.appendChild(header)

  const description = document.createElement('div')
  description.className = 'item-tooltip-description'
  description.textContent = model.description
  tooltip.appendChild(description)

  if (model.statLines.length > 0) {
    const stats = document.createElement('div')
    stats.className = 'item-tooltip-stats'
    for (const line of model.statLines) {
      const stat = document.createElement('div')
      stat.className = 'item-tooltip-stat'
      stat.textContent = line
      stats.appendChild(stat)
    }
    tooltip.appendChild(stats)
  }

  if (model.quantityLine) {
    const quantity = document.createElement('div')
    quantity.className = 'item-tooltip-quantity'
    quantity.textContent = model.quantityLine
    tooltip.appendChild(quantity)
  }

  document.body.appendChild(tooltip)
}

/**
 * Moves the tooltip beside a slot. Puts it to the right when there is room and to the
 * left when the right edge would overflow, then clamps both axes to the viewport so a
 * long description never runs off screen.
 */
export function moveItemTooltip(anchor: DOMRect): void {
  const tooltip = document.getElementById(TOOLTIP_ID)
  if (!tooltip) return

  const rect = tooltip.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = anchor.right + GAP
  if (left + rect.width > viewportWidth - VIEWPORT_PADDING) {
    left = anchor.left - GAP - rect.width
  }
  const clampedLeft = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, viewportWidth - rect.width - VIEWPORT_PADDING),
  )

  const clampedTop = Math.max(
    VIEWPORT_PADDING,
    Math.min(anchor.top, viewportHeight - rect.height - VIEWPORT_PADDING),
  )

  tooltip.style.left = `${clampedLeft}px`
  tooltip.style.top = `${clampedTop}px`
}