/* Tutorial: abre sozinho uma vez (v2 = tutorial completo com capítulos) e pode ser reaberto em Ajustes */
const CHAVE = 'pulpito-tutorial-visto-v4'
const EVENTO = 'pulpito-abrir-tutorial'

export function tutorialJaVisto() {
  try { return localStorage.getItem(CHAVE) === '1' } catch { return true }
}

export function marcarTutorialVisto() {
  try { localStorage.setItem(CHAVE, '1') } catch { /* sem armazenamento */ }
}

/* Sem capítulo, abre o índice; com capítulo, vai direto para ele */
export function abrirTutorial(capitulo?: string) {
  window.dispatchEvent(new CustomEvent<string | undefined>(EVENTO, { detail: capitulo }))
}

export function aoPedirTutorial(fn: (capitulo?: string) => void) {
  const ouvir = (e: Event) => fn((e as CustomEvent<string | undefined>).detail)
  window.addEventListener(EVENTO, ouvir)
  return () => window.removeEventListener(EVENTO, ouvir)
}
