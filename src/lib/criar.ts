import type { TipoProjeto } from './tipos'

/* Abre a folha "O que você vai preparar?" de qualquer tela */
const EVENTO = 'pulpito-criar'
export type PedidoCriar = { pastaId?: string | null; tipo?: TipoProjeto }

export function abrirCriar(pedido: PedidoCriar = {}) {
  window.dispatchEvent(new CustomEvent<PedidoCriar>(EVENTO, { detail: pedido }))
}

export function aoPedirCriar(fn: (p: PedidoCriar) => void) {
  const ouvir = (e: Event) => fn((e as CustomEvent<PedidoCriar>).detail ?? {})
  window.addEventListener(EVENTO, ouvir)
  return () => window.removeEventListener(EVENTO, ouvir)
}

/* Lado da tela inicial (Palavra ou Estudos), lembrado no aparelho */
const CHAVE_MODO = 'pulpito-modo'
export function lerModo(): TipoProjeto {
  try { return localStorage.getItem(CHAVE_MODO) === 'estudo' ? 'estudo' : 'pregacao' } catch { return 'pregacao' }
}
export function salvarModo(m: TipoProjeto) {
  try { localStorage.setItem(CHAVE_MODO, m) } catch { /* sem armazenamento */ }
  window.dispatchEvent(new Event(EVENTO_MODO))
}

/* Avisa quem depende do lado escolhido (ex.: o menu troca Bíblia por Telão nos estudos) */
const EVENTO_MODO = 'pulpito-modo-mudou'
export function aoMudarModo(fn: () => void) {
  window.addEventListener(EVENTO_MODO, fn)
  return () => window.removeEventListener(EVENTO_MODO, fn)
}
