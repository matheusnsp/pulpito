import { supabase } from './supabase'
import type { Mensagem, Slide, Topico } from './tipos'

/*
  Histórico de versões: uma cópia do projeto (mensagem + tópicos + slides) por sessão de edição.
  Restaurar não apaga e recria tudo: atualiza o que existe, recria o que faltava e remove o que sobrou,
  mantendo os ids. Assim as respostas das aulas ligadas aos blocos continuam.
*/

export type DadosVersao = { mensagem: Mensagem; topicos: Topico[]; slides: Slide[] }
export type Versao = { id: string; mensagem_id: string; criado_por: string; criado_em: string; motivo: 'edicao' | 'antes-de-restaurar' | 'manual'; dados: DadosVersao }

const MANTER = 40 // versões guardadas por projeto
const INTERVALO = 30 * 60_000 // uma cópia nova a cada 30 min de edição

export async function fotografar(mensagemId: string): Promise<DadosVersao | null> {
  const [m, t, s] = await Promise.all([
    supabase.from('mensagens').select('*').eq('id', mensagemId).maybeSingle(),
    supabase.from('topicos').select('*').eq('mensagem_id', mensagemId).order('ordem'),
    supabase.from('slides').select('*').eq('mensagem_id', mensagemId).order('ordem'),
  ])
  if (!m.data || t.error || s.error) return null
  return { mensagem: m.data as Mensagem, topicos: (t.data as Topico[]) ?? [], slides: (s.data as Slide[]) ?? [] }
}

export async function salvarVersao(mensagemId: string, motivo: Versao['motivo']) {
  const dados = await fotografar(mensagemId)
  if (!dados) return false
  const { error } = await supabase.from('versoes').insert({ mensagem_id: mensagemId, motivo, dados })
  if (error) return false
  // Mantém só as mais novas
  const { data } = await supabase.from('versoes').select('id').eq('mensagem_id', mensagemId).order('criado_em', { ascending: false }).range(MANTER, MANTER + 50)
  if (data?.length) await supabase.from('versoes').delete().in('id', data.map((v) => v.id))
  return true
}

/* Chamado ao abrir o editor: guarda como estava antes desta sessão de edição */
export async function versaoDaSessao(mensagemId: string) {
  const chave = `pulpito-versao-${mensagemId}`
  try {
    const ultima = Number(sessionStorage.getItem(chave) || 0)
    if (Date.now() - ultima < INTERVALO) return
    sessionStorage.setItem(chave, String(Date.now()))
  } catch { /* sem armazenamento: segue */ }
  const { data, error } = await supabase.from('versoes').select('criado_em').eq('mensagem_id', mensagemId)
    .order('criado_em', { ascending: false }).limit(1)
  if (error) return // banco sem histórico ainda
  if (data?.[0] && Date.now() - new Date(data[0].criado_em).getTime() < INTERVALO) return
  await salvarVersao(mensagemId, 'edicao')
}

export async function listarVersoes(mensagemId: string): Promise<Versao[] | null> {
  const { data, error } = await supabase.from('versoes').select('*').eq('mensagem_id', mensagemId).order('criado_em', { ascending: false })
  if (error) return null
  return data as Versao[]
}

export async function restaurarVersao(v: Versao) {
  const id = v.mensagem_id
  await salvarVersao(id, 'antes-de-restaurar')
  const { mensagem, topicos, slides } = v.dados
  const r = await supabase.from('mensagens').update({
    titulo: mensagem.titulo, texto_base: mensagem.texto_base, tempo_minutos: mensagem.tempo_minutos,
    ...(mensagem.detalhes !== undefined ? { detalhes: mensagem.detalhes } : {}),
  }).eq('id', id)
  if (r.error) throw r.error

  const atuais = await fotografar(id)
  if (!atuais) throw new Error('Não foi possível ler o projeto')
  // Tópicos: remove os que não existiam, depois grava os da versão com os mesmos ids
  const idsT = new Set(topicos.map((t) => t.id))
  const sobrandoT = atuais.topicos.filter((t) => !idsT.has(t.id)).map((t) => t.id)
  const idsS = new Set(slides.map((s) => s.id))
  const sobrandoS = atuais.slides.filter((s) => !idsS.has(s.id)).map((s) => s.id)
  if (sobrandoS.length) { const e = await supabase.from('slides').delete().in('id', sobrandoS); if (e.error) throw e.error }
  if (sobrandoT.length) { const e = await supabase.from('topicos').delete().in('id', sobrandoT); if (e.error) throw e.error }
  if (topicos.length) { const e = await supabase.from('topicos').upsert(topicos); if (e.error) throw e.error }
  if (slides.length) { const e = await supabase.from('slides').upsert(slides); if (e.error) throw e.error }
}
