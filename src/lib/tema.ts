export type Tema = 'sistema' | 'claro' | 'escuro'

const CHAVE = 'pulpito-tema'
const prefereEscuro = () => window.matchMedia('(prefers-color-scheme: dark)')

export const lerTema = (): Tema => (localStorage.getItem(CHAVE) as Tema) || 'sistema'

export function aplicarTema(t: Tema) {
  const escuro = t === 'escuro' || (t === 'sistema' && prefereEscuro().matches)
  document.documentElement.classList.toggle('escuro', escuro)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#0E1424' : '#F5F6F8')
}

export function salvarTema(t: Tema) {
  localStorage.setItem(CHAVE, t)
  aplicarTema(t)
}

/* Chamado uma vez ao abrir o app; acompanha a troca de tema do sistema */
export function iniciarTema() {
  aplicarTema(lerTema())
  prefereEscuro().addEventListener('change', () => {
    if (lerTema() === 'sistema') aplicarTema('sistema')
  })
}