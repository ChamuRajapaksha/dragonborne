const TOAST_ID = 'toast-layer'
const TOAST_LIFETIME_MS = 2200
const MAX_TOASTS = 4

function toastLayer(): HTMLElement {
  const existing = document.getElementById(TOAST_ID)
  if (existing) return existing

  const layer = document.createElement('div')
  layer.id = TOAST_ID
  document.body.appendChild(layer)
  return layer
}

/**
 * Shows a short-lived message above the hotbar. The layer is a singleton and each
 * toast removes its own node when its timer fires, so repeated calls can never
 * accumulate elements — and an old toast expiring mid-repaint can't delete a newer
 * one, because the removal is bound to the node it created.
 */
export function showToast(text: string): void {
  const layer = toastLayer()

  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = text
  layer.appendChild(toast)

  while (layer.childElementCount > MAX_TOASTS) {
    layer.firstElementChild?.remove()
  }

  window.setTimeout(() => {
    toast.remove()
    if (layer.childElementCount === 0) layer.remove()
  }, TOAST_LIFETIME_MS)
}