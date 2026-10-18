/* Tutorial de primeiro uso: abre sozinho uma vez e pode ser reaberto em Ajustes */
const CHAVE = 'pulpito-tutorial-visto'
const EVENTO = 'pulpito-abrir-tutorial'

export function tutorialJaVisto() {
  try { return localStorage.getItem(CHAVE) === '1' } catch { return true }
}

export function marcarTutorialVisto() {
  try { localStorage.setItem(CHAVE, '1') } catch { /* sem armazenamento */ }
}

export function abrirTutorial() {
  window.dispatchEvent(new Event(EVENTO))
}

export function aoPedirTutorial(fn: () => void) {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}
