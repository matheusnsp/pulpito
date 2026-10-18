export type Tema = 'amarelo' | 'marinho' | 'grafite' | 'claro'

export const TEMAS: { valor: Tema; rotulo: string; fundo: string; acao: string; texto: string }[] = [
  { valor: 'amarelo', rotulo: 'Preto e amarelo', fundo: '#0A0A0A', acao: '#FFC107', texto: '#F5F5F5' },
  { valor: 'marinho', rotulo: 'Azul-marinho e dourado', fundo: '#0B1220', acao: '#E8B44A', texto: '#EEF2FA' },
  { valor: 'grafite', rotulo: 'Grafite e verde-água', fundo: '#0F1113', acao: '#2DD4BF', texto: '#F1F3F5' },
  { valor: 'claro', rotulo: 'Branco e preto', fundo: '#FAFAFA', acao: '#111111', texto: '#111111' },
]

const CHAVE = 'pulpito-tema'

/* Aceita também os valores antigos (sistema, claro, escuro) */
export function lerTema(): Tema {
  const t = localStorage.getItem(CHAVE)
  return TEMAS.some((x) => x.valor === t) ? (t as Tema) : 'amarelo'
}

export function aplicarTema(t: Tema) {
  const html = document.documentElement
  TEMAS.forEach((x) => html.classList.remove(`tema-${x.valor}`))
  html.classList.add(`tema-${t}`)
  html.classList.toggle('escuro', t !== 'claro')
  const cor = TEMAS.find((x) => x.valor === t)?.fundo ?? '#0A0A0A'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cor)
}

export function salvarTema(t: Tema) {
  localStorage.setItem(CHAVE, t)
  aplicarTema(t)
}

export function iniciarTema() {
  aplicarTema(lerTema())
}
