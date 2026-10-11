import { createItemIcon } from './itemIcon'
import type { ItemTooltipModel } from './itemTooltipModel'

const TOOLTIP_ID = 'item-tooltip'

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

/** Moves the tooltip beside a slot, just off its top-right corner. */
export function moveItemTooltip(anchor: DOMRect): void {
  const tooltip = document.getElementById(TOOLTIP_ID)
  if (!tooltip) return

  tooltip.style.left = `${anchor.right + 8}px`
  tooltip.style.top = `${anchor.top}px`
}