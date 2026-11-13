import { getClassById } from './character'
import {
  buildQuestLog,
  formatUnmetStats,
  getCompletedQuestIds,
  groupQuestLog,
  questLogSummary,
} from './story'
import type { QuestLogEntry } from './story'

const PANEL_ID = 'quest-journal'

export function isQuestJournalOpen(): boolean {
  return document.getElementById(PANEL_ID) !== null
}

export function closeQuestJournal(): void {
  document.getElementById(PANEL_ID)?.remove()
}

function statusLabel(entry: QuestLogEntry): string {
  switch (entry.status) {
    case 'completed':
      return '<span class="quest-status">Completed</span>'
    case 'locked':
      return '<span class="quest-status locked">Locked</span>'
    case 'available':
      return '<span class="quest-status ready">Ready</span>'
  }
}

function entryMarkup(entry: QuestLogEntry): string {
  const { quest } = entry
  const requirements =
    entry.status === 'locked'
      ? `<span class="quest-requirements">Requires: ${formatUnmetStats(entry.unmetStats)}</span>`
      : ''

  return `
    <div class="quest-card ${entry.status}">
      <div class="quest-journal-card-head">
        <h3>${quest.title}</h3>
        ${statusLabel(entry)}
      </div>
      <p class="quest-journal-npc">Offered by ${entry.npcName}</p>
      <p>${quest.description}</p>
      ${requirements}
    </div>`
}

export function showQuestJournal(
  classId: string,
  stats: Record<string, number>,
): void {
  closeQuestJournal()

  const entries = buildQuestLog(classId, stats, getCompletedQuestIds())
  const summary = questLogSummary(entries)
  const sections = groupQuestLog(entries).filter((section) => section.entries.length > 0)
  const className = getClassById(classId)?.name ?? 'Unknown'

  const overlay = document.createElement('div')
  overlay.id = PANEL_ID

  const markup =
    sections.length === 0
      ? '<p class="quest-journal-empty">No quests are recorded for this class yet.</p>'
      : sections
          .map(
            (section) => `
          <section class="quest-journal-section">
            <h3 class="quest-journal-section-title">${section.title}
              <span>${section.entries.length}</span>
            </h3>
            ${section.entries.map(entryMarkup).join('')}
          </section>`,
          )
          .join('')

  overlay.innerHTML = `
    <div class="quest-journal-panel">
      <p class="quest-journal-kicker">${className} journal</p>
      <h2>Quest Journal</h2>
      <p class="quest-journal-summary">
        ${summary.available} available &middot; ${summary.locked} locked &middot; ${summary.completed} completed
      </p>
      <div class="quest-journal-body">${markup}</div>
      <button id="quest-journal-close">Close</button>
    </div>
  `

  overlay.querySelector('#quest-journal-close')!.addEventListener('click', () => {
    overlay.remove()
  })

  document.body.appendChild(overlay)
}
