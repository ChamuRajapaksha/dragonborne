import { getItemById } from './inventory'
import { toCssColor } from './world/tileset'

/**
 * Placeholder icon for an item: its catalog glyph on a tint of its own colour.
 * Deliberately a span rather than a canvas — the panel markup is plain HTML and
 * hand-restyled later, so nothing here should need a re-render path.
 */
export function createItemIcon(itemId: string): HTMLElement {
  const item = getItemById(itemId)
  const icon = document.createElement('span')
  icon.className = 'inv-slot-glyph'
  icon.dataset.itemId = itemId

  if (!item) {
    icon.textContent = '?'
    return icon
  }

  const color = toCssColor(item.icon.color)
  icon.textContent = item.icon.glyph
  icon.style.color = color
  icon.style.textShadow = `0 0 6px ${color}`
  return icon
}

/**
 * Fills every `[data-item-id]` placeholder inside `root` with a real icon. Called
 * after the panel re-renders, since `innerHTML` wipes the painted spans.
 */
export function paintItemIcons(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-item-id]').forEach((placeholder) => {
    const itemId = placeholder.dataset.itemId
    if (!itemId) return
    placeholder.replaceWith(createItemIcon(itemId))
  })
}