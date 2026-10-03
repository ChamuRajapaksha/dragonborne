import type { AreaIntro } from './world/areas'

const INTRO_CARD_ID = 'intro-card'

export function closeIntroCard(): void {
  document.getElementById(INTRO_CARD_ID)?.remove()
}

export function showIntroCard(intro: AreaIntro, onDismiss: () => void): void {
  closeIntroCard()

  const overlay = document.createElement('div')
  overlay.id = INTRO_CARD_ID
  overlay.innerHTML = `
    <div class="intro-panel">
      <h2>${intro.title}</h2>
      <div class="intro-body">
        ${intro.body.map((line) => `<p>${line}</p>`).join('')}
      </div>
      <button id="intro-dismiss">Continue</button>
    </div>
  `
  document.body.appendChild(overlay)

  overlay.querySelector('#intro-dismiss')!.addEventListener('click', () => {
    overlay.remove()
    onDismiss()
  })
}
