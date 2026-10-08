import {
  getQuestsForNpc,
  meetsQuestRequirements,
  completeQuest,
  isQuestCompleted,
} from './story'
import type { ItemReward, NpcDefinition, Quest } from './story'
import { addItem, getItemById, updateInventory } from './inventory'
import { showToast } from './toast'

/**
 * Pays a quest's rewards into the pack. Runs only on first completion, so each
 * reward is granted exactly once. Anything that does not fit is reported rather
 * than silently dropped — the reward itself is already spent.
 */
function grantQuestRewards(rewards: readonly ItemReward[]): void {
  const granted: string[] = []
  let shortfall = 0

  updateInventory((current) => {
    let next = current

    for (const reward of rewards) {
      const result = addItem(next, reward.itemId, reward.quantity ?? 1)
      next = result.state
      shortfall += result.remainder
      if (result.added > 0) granted.push(getItemById(reward.itemId)?.name ?? reward.itemId)
    }

    return next
  })

  if (granted.length > 0) showToast(`Received: ${granted.join(', ')}`)
  if (shortfall > 0) showToast('Your pack is full')
}

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
  npc: NpcDefinition,
  classId: string,
  stats: Record<string, number>,
): void {
  closeQuestPopup()

  const overlay = document.createElement('div')
  overlay.id = 'quest-popup'
  document.body.appendChild(overlay)

  const render = () => {
    const quests = getQuestsForNpc(npc.id, classId)

    overlay.innerHTML = `
      <div class="quest-panel">
        <p class="quest-npc-role">${npc.role}</p>
        <h2>${npc.name}</h2>
        <p class="quest-npc-greeting">${npc.greeting}</p>
        ${quests.length === 0
          ? '<p>Nothing here for someone of your class.</p>'
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
          const questId = button.dataset.complete!
          const quest = quests.find((entry) => entry.id === questId)
          const firstCompletion = completeQuest(questId)
          if (firstCompletion && quest?.rewards?.length) grantQuestRewards(quest.rewards)
          render()
        })
      })

    overlay.querySelector('#quest-close')!.addEventListener('click', () => {
      overlay.remove()
    })
  }

  render()
}