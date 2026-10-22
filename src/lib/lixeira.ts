import { supabase } from './supabase'
import type { Mensagem } from './tipos'

/*
  Lixeira: excluir marca excluida_em; depois de 30 dias o app apaga de vez.
  Se o banco ainda não tem a coluna (SQL da lixeira não rodou), exclui direto, como antes.
*/
export const DIAS_LIXEIRA = 30

const semColuna = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42703' || e.code === 'PGRST204' || /excluida_em/.test(e.message ?? ''))

/* Aparece nas listas: não está na lixeira e não é modelo */
export const visivel = (m: Pick<Mensagem, 'excluida_em' | 'detalhes'>) => !m.excluida_em && !m.detalhes?.ehModelo

export async function moverParaLixeira(id: string): Promise<'lixeira' | 'apagada'> {
  const { error } = await supabase.from('mensagens').update({ excluida_em: new Date().toISOString() }).eq('id', id)
  if (!error) return 'lixeira'
  if (!semColuna(error)) throw error
  const r = await supabase.from('mensagens').delete().eq('id', id)
  if (r.error) throw r.error
  return 'apagada'
}

export async function restaurar(id: string) {
  const { error } = await supabase.from('mensagens').update({ excluida_em: null }).eq('id', id)
  if (error) throw error
}

export async function apagarDeVez(id: string) {
  const { error } = await supabase.from('mensagens').delete().eq('id', id)
  if (error) throw error
}

export const diasRestantes = (excluidaEm: string) =>
  Math.max(0, DIAS_LIXEIRA - Math.floor((Date.now() - new Date(excluidaEm).getTime()) / 86_400_000))

/* Lista a lixeira de quem está logado e apaga de vez o que passou de 30 dias */
export async function carregarLixeira(usuarioId: string): Promise<Mensagem[] | null> {
  const { data, error } = await supabase.from('mensagens').select('*').not('excluida_em', 'is', null).order('excluida_em', { ascending: false })
  if (error) return semColuna(error) ? null : []
  const minhas = (data as Mensagem[]).filter((m) => !m.proprietario_compartilhamento || m.proprietario_compartilhamento === usuarioId)
  const vencidas = minhas.filter((m) => diasRestantes(m.excluida_em!) === 0)
  if (vencidas.length) await supabase.from('mensagens').delete().in('id', vencidas.map((m) => m.id))
  return minhas.filter((m) => !vencidas.includes(m))
}
