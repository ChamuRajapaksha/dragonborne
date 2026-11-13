import { getClassById } from './character'
import {
  buildQuestLog,
  canTrackQuest,
  formatUnmetStats,
  getCompletedQuestIds,
  getTrackedQuestId,
  groupQuestLog,
  questLogSummary,
  resolveTrackedQuest,
  setTrackedQuestId,
  toggleTrackedQuest,
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

function entryMarkup(entry: QuestLogEntry, trackedId: string | null): string {
  const { quest } = entry
  const isTracked = quest.id === trackedId
  const requirements =
    entry.status === 'locked'
      ? `<span class="quest-requirements">Requires: ${formatUnmetStats(entry.unmetStats)}</span>`
      : ''
  const trackButton = canTrackQuest(entry)
    ? `<button class="quest-track" data-track="${quest.id}">${isTracked ? 'Untrack' : 'Track'}</button>`
    : ''

  return `
    <div class="quest-card ${entry.status} ${isTracked ? 'tracked' : ''}">
      <div class="quest-journal-card-head">
        <h3>${quest.title}</h3>
        <div class="quest-journal-card-actions">
          ${statusLabel(entry)}
          ${trackButton}
        </div>
      </div>
      <p class="quest-journal-npc">Offered by ${entry.npcName}</p>
      <p>${quest.description}</p>
      ${requirements}
    </div>`
}

function bodyMarkup(
  entries: readonly QuestLogEntry[],
  trackedId: string | null,
): string {
  const sections = groupQuestLog(entries).filter((section) => section.entries.length > 0)
  if (sections.length === 0) {
    return '<p class="quest-journal-empty">No quests are recorded for this class yet.</p>'
  }

  return sections
    .map(
      (section) => `
    <section class="quest-journal-section">
      <h3 class="quest-journal-section-title">${section.title}
        <span>${section.entries.length}</span>
      </h3>
      ${section.entries.map((entry) => entryMarkup(entry, trackedId)).join('')}
    </section>`,
    )
    .join('')
}

export function showQuestJournal(
  classId: string,
  stats: Record<string, number>,
): void {
  closeQuestJournal()

  const className = getClassById(classId)?.name ?? 'Unknown'
  const overlay = document.createElement('div')
  overlay.id = PANEL_ID

  const render = (): void => {
    const entries = buildQuestLog(classId, stats, getCompletedQuestIds())
    const summary = questLogSummary(entries)
    const trackedId = resolveTrackedQuest(entries, getTrackedQuestId())?.quest.id ?? null

    overlay.innerHTML = `
      <div class="quest-journal-panel">
        <p class="quest-journal-kicker">${className} journal</p>
        <h2>Quest Journal</h2>
        <p class="quest-journal-summary">
          ${summary.available} available &middot; ${summary.locked} locked &middot; ${summary.completed} completed
        </p>
        <div class="quest-journal-body">${bodyMarkup(entries, trackedId)}</div>
        <button id="quest-journal-close">Close</button>
      </div>
    `

    overlay
      .querySelectorAll<HTMLButtonElement>('[data-track]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          const questId = button.dataset.track!
          setTrackedQuestId(toggleTrackedQuest(trackedId, questId))
          render()
        })
      })

    overlay.querySelector('#quest-journal-close')!.addEventListener('click', () => {
      overlay.remove()
    })
  }

  render()
  document.body.appendChild(overlay)
}
