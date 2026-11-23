import { CLASSES, createCharacter, saveCharacter } from './character'
import type { Character } from './character'
import { resetGold } from './economy'
import { resetEscorts } from './escort'
import { resetReputation } from './factions'
import { grantStartingKit, resetInventory, updateInventory } from './inventory'
import { resetProgression } from './progression'
import { clearCompletedQuests, clearTrackedQuest } from './story'
import { clearClockSave } from './world/clockStorage'

export function showCreationScreen(onCreated: (character: Character) => void): void {
  const overlay = document.createElement('div')
  overlay.id = 'character-creation'
  overlay.innerHTML = `
    <form id="creation-form">
      <h1>Create your character</h1>
      <label>
        Name
        <input id="name-input" type="text" maxlength="20" autocomplete="off" />
      </label>
      <fieldset>
        <legend>Class</legend>
        ${CLASSES.map(
          (c) => `
          <label class="class-option">
            <input type="radio" name="class" value="${c.id}" />
            <span>${c.name}</span>
          </label>`,
        ).join('')}
      </fieldset>
      <button type="submit">Start adventuring</button>
    </form>
  `
  document.body.appendChild(overlay)

  const form = overlay.querySelector<HTMLFormElement>('#creation-form')
  if (!form) return

  form.addEventListener('submit', (event) => {
    event.preventDefault()

    const nameInput = overlay.querySelector<HTMLInputElement>('#name-input')!
    const checked = overlay.querySelector<HTMLInputElement>('input[name="class"]:checked')
    if (!nameInput.value.trim() || !checked) {
      return
    }

    const character = createCharacter(nameInput.value, checked.value)
    if (!character) return

    saveCharacter(character)
    resetInventory()
    resetGold()
    resetReputation()
    resetProgression()
    resetEscorts()
    clearCompletedQuests()
    clearTrackedQuest()
    clearClockSave()
    updateInventory(grantStartingKit)
    overlay.remove()
    onCreated(character)
  })
}