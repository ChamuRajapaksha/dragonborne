import {
  getCompletedQuestIds,
  getNpcById,
  getQuestsForNpc,
  meetsQuestRequirements,
  completeQuest,
  isQuestCompleted,
  npcGreeting,
} from './story'
import type { ItemReward, NpcDefinition, Quest } from './story'
import {
  canAskEscortToFollow,
  canCompleteEscortQuest,
  canStartEscort,
  escortStatusLine,
  getActiveEscort,
  getEscortDefinition,
  setActiveEscort,
  startEscort,
} from './escort'
import {
  applyReputation,
  formatReputationAward,
  formatReputationRewards,
  getAllReputation,
  getFactionById,
  isReputationMet,
  reputationAwardChanges,
  unmetReputation,
} from './factions'
import type { ReputationReward } from './factions'
import { addItem, getItemById, updateInventory } from './inventory'
import { getLevel, grantXp } from './progression'
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

/** Pays a quest's XP once and returns how many levels the award crossed. */
function grantQuestXp(amount: number): number {
  if (amount <= 0) return 0
  const levelsGained = grantXp(amount)
  showToast(`+${amount} XP`)
  return levelsGained
}

/** Applies a quest's standing changes once and toasts each visible change. */
function grantQuestReputation(rewards: readonly ReputationReward[]): void {
  const before = getAllReputation()
  applyReputation(rewards)
  for (const change of reputationAwardChanges(rewards, before)) {
    showToast(formatReputationAward(change))
  }
}

export function closeQuestPopup(): void {
  document.getElementById('quest-popup')?.remove()
}

function renderRequirements(
  q: Quest,
  stats: Record<string, number>,
  reputation: Readonly<Record<string, number>>,
): string {
  const unmetStats = Object.entries(q.requiresStats ?? {})
    .filter(([stat, min]) => (stats[stat] ?? 0) < (min ?? 0))
    .map(([stat, min]) => `${stat} ${min}+`)
  const unmetStanding = unmetReputation(q.requiresReputation ?? [], reputation).map(
    (entry) => `${getFactionById(entry.factionId)?.name ?? entry.factionId} ${entry.required}+`,
  )
  const unmet = [...unmetStats, ...unmetStanding]
  if (unmet.length === 0) return ''
  return `<span class="quest-requirements">Requires: ${unmet.join(', ')}</span>`
}

function renderEscortStatus(q: Quest): string {
  if (!q.escortId) return ''
  const definition = getEscortDefinition(q.escortId)
  const active = getActiveEscort()
  if (!definition || active?.escortId !== definition.id) return ''
  const status = escortStatusLine(active, definition)
  return status ? `<span class="escort-status">${status}</span>` : ''
}

function renderFollowButton(
  q: Quest,
  unlocked: boolean,
  completed: boolean,
  hasLocation: boolean,
): string {
  if (!q.escortId || !unlocked || completed || !hasLocation) return ''
  if (!canAskEscortToFollow(q.id, q.escortId, getActiveEscort(), getCompletedQuestIds(), unlocked)) {
    return ''
  }
  return `<button data-follow="${q.id}">Ask to follow</button>`
}

function renderXpReward(q: Quest): string {
  if (!q.xp) return ''
  return `<span class="quest-rewards">XP: ${q.xp}</span>`
}

function renderReputationRewards(q: Quest): string {
  if (!q.reputation?.length) return ''
  return `<span class="quest-rewards">Standing: ${formatReputationRewards(q.reputation)}</span>`
}

export function showQuestPopup(
  npc: NpcDefinition,
  classId: string,
  stats: Record<string, number>,
  location?: { areaId: string; x: number; y: number },
): void {
  closeQuestPopup()

  const overlay = document.createElement('div')
  overlay.id = 'quest-popup'
  document.body.appendChild(overlay)

  const render = () => {
    const quests = getQuestsForNpc(npc.id, classId)
    const reputation = getAllReputation()

    overlay.innerHTML = `
      <div class="quest-panel">
        <p class="quest-npc-role">${npc.role}</p>
        <h2>${npc.name}</h2>
        <p class="quest-npc-greeting">${npcGreeting(npc, reputation)}</p>
        ${quests.length === 0
          ? '<p>Nothing here for someone of your class.</p>'
          : quests
              .map((q) => {
                const unlocked =
                  meetsQuestRequirements(q, stats) &&
                  isReputationMet(q.requiresReputation ?? [], reputation)
                const completed = isQuestCompleted(q.id)
                const lockedClass = !unlocked && !completed ? 'locked' : ''
                const canComplete = canCompleteEscortQuest(
                  q.id,
                  q.escortId,
                  getActiveEscort(),
                  getCompletedQuestIds(),
                )
                return `
          <div class="quest-card ${completed ? 'completed' : ''} ${lockedClass}">
            <h3>${q.title}</h3>
            <p>${q.description}</p>
            ${renderEscortStatus(q)}
            ${renderFollowButton(q, unlocked, completed, Boolean(location))}
            ${renderRequirements(q, stats, reputation)}
            ${renderXpReward(q)}
            ${renderReputationRewards(q)}
            ${
              completed
                ? '<span class="quest-status">Completed</span>'
                : unlocked
                  ? `<button data-complete="${q.id}" ${canComplete ? '' : 'disabled'}>Complete (stub)</button>`
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
          if (
            !canCompleteEscortQuest(
              questId,
              quest?.escortId,
              getActiveEscort(),
              getCompletedQuestIds(),
            )
          ) {
            showToast('Reach the final stop before completing this quest')
            return
          }
          const firstCompletion = completeQuest(questId)
          if (firstCompletion) {
            const levelsGained = grantQuestXp(quest?.xp ?? 0)
            if (levelsGained > 0) showToast(`Level up! You are now level ${getLevel()}`)
            if (quest?.rewards?.length) grantQuestRewards(quest.rewards)
            if (quest?.reputation?.length) grantQuestReputation(quest.reputation)
          }
          render()
        })
      })

    overlay.querySelectorAll<HTMLButtonElement>('[data-follow]').forEach((button) => {
      button.addEventListener('click', () => {
        const questId = button.dataset.follow!
        const quest = quests.find((entry) => entry.id === questId)
        const definition = quest?.escortId ? getEscortDefinition(quest.escortId) : null
        if (!quest || !definition || !location) return
        if (!canStartEscort(definition, getActiveEscort(), getCompletedQuestIds())) {
          showToast('You can only lead one companion at a time')
          return
        }
        setActiveEscort(startEscort(definition, location))
        showToast(`${getNpcById(quest.npcId)?.name ?? definition.npcId} is following you`)
        render()
      })
    })

    overlay.querySelector('#quest-close')!.addEventListener('click', () => {
      overlay.remove()
    })
  }

  render()
}