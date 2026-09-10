import {
  getQuestsForClass,
  meetsQuestRequirements,
  completeQuest,
  isQuestCompleted,
} from './story'
import type { Quest } from './story'

export function closeQuestPopup(): void {
  document.getElementById('quest-popup')?.remove()
}

function renderRequirements(q: Quest, stats: Record<string, number>): string {
  if (!q.requiresStats) return ''
  const unmet = Object.entries(q.requiresStats)
    .filter(([stat, min]) => (stats[stat] ?? 0) < (min ?? 0))
    .map(([stat, min]) => `${stat} ${min}+`)
  if (unmet.length === 0) return ''
  return `<span class="quest-requirements">Requires: ${unmet.join(', ')}</span>`
}

export function showQuestPopup(
  classId: string,
  stats: Record<string, number>,
): void {
  closeQuestPopup()

  const overlay = document.createElement('div')
  overlay.id = 'quest-popup'
  document.body.appendChild(overlay)

  const render = () => {
    const quests = getQuestsForClass(classId)

    overlay.innerHTML = `
      <div class="quest-panel">
        <h2>Quests available for you</h2>
        ${quests.length === 0
          ? '<p>No quests are offered to your class right now.</p>'
          : quests
              .map((q) => {
                const unlocked = meetsQuestRequirements(q, stats)
                const completed = isQuestCompleted(q.id)
                const lockedClass = !unlocked && !completed ? 'locked' : ''
                return `
          <div class="quest-card ${completed ? 'completed' : ''} ${lockedClass}">
            <h3>${q.title}</h3>
            <p>${q.description}</p>
            ${renderRequirements(q, stats)}
            ${
              completed
                ? '<span class="quest-status">Completed</span>'
                : unlocked
                  ? `<button data-complete="${q.id}">Complete (stub)</button>`
                  : '<span class="quest-status locked">Locked</span>'
            }
          </div>`
              })
              .join('')}
        <button id="quest-close">Close</button>
      </div>
    `

    overlay
      .querySelectorAll<HTMLButtonElement>('[data-complete]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          completeQuest(button.dataset.complete!)
          render()
        })
      })

    overlay.querySelector('#quest-close')!.addEventListener('click', () => {
      overlay.remove()
    })
  }

  render()
}