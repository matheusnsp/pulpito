import { supabase } from './supabase'
import { CAMPOS_TOPICO, type Mensagem, type Slide, type Topico } from './tipos'
import { formatarReferencia, parseReferencia } from './biblia'

const NAO_COPIAR = new Set(['id', 'mensagem_id', 'criado_em', 'atualizado_em'])
const copiavel = (linha: object) =>
  Object.fromEntries(Object.entries(linha).filter(([k]) => !NAO_COPIAR.has(k)))

/* Cria uma mensagem vazia e devolve o id */
export async function criarMensagem(pastaId: string | null = null) {
  const { data, error } = await supabase.from('mensagens')
    .insert({ pasta_id: pastaId }).select('id').single()
  if (error || !data) throw error ?? new Error('sem dados')
  return data.id as string
}

/* Copia a mensagem com tópicos e slides. Devolve a nova mensagem. */
export async function duplicarMensagem(m: Mensagem): Promise<Mensagem> {
  const [t, s] = await Promise.all([
    supabase.from('topicos').select('*').eq('mensagem_id', m.id).order('ordem'),
    supabase.from('slides').select('*').eq('mensagem_id', m.id).order('ordem'),
  ])
  if (t.error) throw t.error

  const { data: nova, error } = await supabase.from('mensagens').insert({
    titulo: `${m.titulo || 'Sem título'} (cópia)`,
    texto_base: m.texto_base,
    tempo_minutos: m.tempo_minutos,
    pasta_id: m.pasta_id,
  }).select().single()
  if (error || !nova) throw error ?? new Error('sem dados')

  const topicos = (t.data as Topico[]) ?? []
  const mapa = new Map<string, string>()
  if (topicos.length) {
    const linhas = topicos.map((t) => ({ ...copiavel(t), mensagem_id: nova.id }))
    const { data: novos, error: e2 } = await supabase.from('topicos').insert(linhas).select('id, ordem')
    if (e2) throw e2
    for (const n of (novos ?? []) as { id: string; ordem: number }[]) {
      const original = topicos.find((x) => x.ordem === n.ordem)
      if (original) mapa.set(original.id, n.id)
    }
  }

  const slides = (s.data as Slide[]) ?? []
  if (slides.length) {
    const linhas = slides.map((sl) => ({
      ...copiavel(sl),
      mensagem_id: nova.id,
      topico_id: sl.topico_id ? mapa.get(sl.topico_id) ?? null : null,
    }))
    await supabase.from('slides').insert(linhas)
  }

  return nova as Mensagem
}

/* Esboço em texto puro, bom para colar no WhatsApp ou nas notas */
export function esbocoEmTexto(m: Mensagem, topicos: Topico[]) {
  const ref = (t: string | null) => {
    const r = t ? parseReferencia(t) : null
    return r ? formatarReferencia(r) : t?.trim() || ''
  }
  const linhas: string[] = [`*${m.titulo || 'Sem título'}*`]
  if (m.texto_base) linhas.push(`Texto base: ${ref(m.texto_base)}`)
  linhas.push('')
  topicos.forEach((t, i) => {
    linhas.push(`${i + 1}. ${t.titulo || 'Sem título'}${t.versiculo ? ` (${ref(t.versiculo)})` : ''}`)
    for (const c of CAMPOS_TOPICO) {
      if (c.chave === 'notas') continue
      const v = t[c.chave]?.trim()
      if (v) linhas.push(`   ${c.rotulo}: ${v.replace(/\n+/g, ' ')}`)
    }
    linhas.push('')
  })
  return linhas.join('\n').trim()
}
