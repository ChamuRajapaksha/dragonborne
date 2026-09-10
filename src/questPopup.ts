import { getQuestsForClass, completeQuest, isQuestCompleted } from './story'

export function closeQuestPopup(): void {
  document.getElementById('quest-popup')?.remove()
}

export function showQuestPopup(classId: string): void {
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
              .map(
                (q) => `
          <div class="quest-card ${isQuestCompleted(q.id) ? 'completed' : ''}">
            <h3>${q.title}</h3>
            <p>${q.description}</p>
            ${
              isQuestCompleted(q.id)
                ? '<span class="quest-status">Completed</span>'
                : `<button data-complete="${q.id}">Complete (stub)</button>`
            }
          </div>`,
              )
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