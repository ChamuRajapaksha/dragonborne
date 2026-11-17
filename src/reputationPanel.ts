import { getAllReputation, subscribeReputation } from './factions'
import {
  buildReputationRows,
  formatReputationSummary,
} from './reputation/reputationPanelModel'
import type { FactionStandingRow } from './reputation/reputationPanelModel'

const PANEL_ID = 'reputation-panel'

let unsubscribe: (() => void) | null = null

export function isReputationPanelOpen(): boolean {
  return document.getElementById(PANEL_ID) !== null
}

export function closeReputationPanel(): void {
  unsubscribe?.()
  unsubscribe = null
  document.getElementById(PANEL_ID)?.remove()
}

function rowHtml(row: FactionStandingRow): string {
  const fill = row.value < 0 ? 'negative' : 'positive'
  return `
    <div class="reputation-card">
      <div class="reputation-card-head">
        <h3>${row.name}</h3>
        <span class="reputation-tier">${row.tierLabel} · ${row.value} / 100</span>
      </div>
      <div class="reputation-bar">
        <div class="reputation-bar-fill ${fill}" style="width: ${row.barPercent}%"></div>
      </div>
      <p class="reputation-description">${row.description}</p>
      ${row.priceNote ? `<p class="reputation-price">Prices: ${row.priceNote}</p>` : ''}
    </div>`
}

/** DOM overlay mirroring the quest journal: fixed id, live re-render, Close button. */
export function showReputationPanel(): void {
  closeReputationPanel()

  const overlay = document.createElement('div')
  overlay.id = PANEL_ID
  document.body.appendChild(overlay)

  const render = (): void => {
    const rows = buildReputationRows(getAllReputation())
    overlay.innerHTML = `
      <div class="reputation-panel">
        <h2>Reputation</h2>
        <p class="reputation-summary">${formatReputationSummary(rows)}</p>
        <div class="reputation-body">${rows.map(rowHtml).join('')}</div>
        <button class="reputation-close">Close</button>
      </div>
    `
    overlay.querySelector('.reputation-close')!.addEventListener('click', () => {
      closeReputationPanel()
    })
  }

  render()
  unsubscribe = subscribeReputation(() => render())
}
