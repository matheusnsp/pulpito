import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { VERSOES, type VersaoId } from './biblia'

/*
  Versão da Bíblia salva na conta (nos dados do usuário no Supabase),
  para valer em qualquer aparelho em que a pessoa entrar.
  O aparelho guarda uma cópia para abrir rápido e funcionar sem internet.
*/
const CHAVE = 'pulpito-versao'
const EVENTO = 'pulpito-versao-mudou'
const valida = (v: unknown): v is VersaoId => VERSOES.some((x) => x.id === v)

export function lerVersao(): VersaoId {
  try {
    const v = localStorage.getItem(CHAVE)
    return valida(v) ? v : 'ARA'
  } catch { return 'ARA' }
}

function guardarNoAparelho(v: VersaoId) {
  try { localStorage.setItem(CHAVE, v) } catch { /* sem armazenamento */ }
  window.dispatchEvent(new Event(EVENTO))
}

export async function salvarVersao(v: VersaoId) {
  guardarNoAparelho(v)
  try { await supabase.auth.updateUser({ data: { versao_biblia: v } }) } catch { /* sem internet: fica no aparelho */ }
}

/* Ao entrar na conta: usa a versão salva nela (ou leva a do aparelho para a conta) */
export function aplicarVersaoDaConta(usuario: User) {
  const daConta = usuario.user_metadata?.versao_biblia
  if (valida(daConta)) {
    if (daConta !== lerVersao()) guardarNoAparelho(daConta)
  } else {
    supabase.auth.updateUser({ data: { versao_biblia: lerVersao() } }).catch(() => {})
  }
}

/* Busca a versão mais recente da conta (pode ter sido trocada em outro aparelho) */
export async function sincronizarVersao() {
  try {
    const { data } = await supabase.auth.getUser()
    if (data.user) aplicarVersaoDaConta(data.user)
  } catch { /* sem internet */ }
}

export function aoMudarVersao(fn: () => void) {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}
