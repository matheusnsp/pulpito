import { supabase } from './supabase'
import { CAMPOS_TOPICO, type Mensagem, type Slide, type Topico, type TipoProjeto } from './tipos'
import { MODELOS, defBloco, ehBloco, itensDaLista } from './blocos'
import { formatarReferencia, parseReferencia, dividirReferencias } from './biblia'

const NAO_COPIAR = new Set(['id', 'mensagem_id', 'criado_em', 'atualizado_em'])
const copiavel = (linha: object) =>
  Object.fromEntries(Object.entries(linha).filter(([k]) => !NAO_COPIAR.has(k)))

/* Erro de quando o banco ainda não tem as colunas do modo Estudos (falta rodar supabase/estudos.sql) */
export const FALTA_SQL_ESTUDOS = 'falta-sql-estudos'
const semColunas = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST204' || e.code === '42703' || /column .*(tipo|detalhes|extra)/i.test(e.message ?? ''))

/* Cria um item do lado Palavra (pregação em branco ou um formato com blocos) ou um estudo, e devolve o id */
export async function criarMensagem(pastaId: string | null = null, opcoes: { tipo?: TipoProjeto; modelo?: string } = {}) {
  const tipo: TipoProjeto = opcoes.tipo === 'estudo' ? 'estudo' : 'pregacao'
  const modelo = MODELOS.find((m) => m.id === opcoes.modelo)
  // Livre: texto corrido, sem tópicos nem blocos pré-definidos, em qualquer um dos lados
  if (opcoes.modelo === 'livre') {
    const { data, error } = await supabase.from('mensagens')
      .insert({ pasta_id: pastaId, tipo, titulo: '', detalhes: { formato: 'livre' } }).select('id').single()
    if (semColunas(error)) throw new Error(FALTA_SQL_ESTUDOS)
    if (error || !data) throw error ?? new Error('sem dados')
    return data.id as string
  }
  // Pregação em branco: como sempre foi (funciona mesmo sem o SQL dos estudos)
  if (tipo === 'pregacao' && !modelo) {
    const { data, error } = await supabase.from('mensagens')
      .insert({ pasta_id: pastaId }).select('id').single()
    if (error || !data) throw error ?? new Error('sem dados')
    return data.id as string
  }
  const { data, error } = await supabase.from('mensagens').insert({
    pasta_id: pastaId, tipo,
    titulo: modelo ? modelo.nome : '',
    tempo_minutos: modelo?.minutos ?? 45,
    detalhes: { ...(modelo ? { objetivo: modelo.objetivo } : {}), ...(tipo === 'pregacao' && modelo ? { formato: modelo.id } : {}) },
  }).select('id').single()
  if (semColunas(error)) throw new Error(FALTA_SQL_ESTUDOS)
  if (error || !data) throw error ?? new Error('sem dados')
  if (modelo) {
    await supabase.from('topicos').insert(modelo.blocos.map((b, i) => ({
      mensagem_id: data.id, ordem: i, tipo: b.tipo, titulo: b.titulo, observacao: b.observacao ?? null,
      extra: b.minutos ? { minutos: b.minutos } : {},
    })))
  }
  return data.id as string
}

const semChaves = <T extends object>(o: T, chaves: (keyof T)[]): T => {
  const r = { ...o }
  for (const k of chaves) delete r[k]
  return r
}

/* Copia a mensagem com tópicos e slides. Devolve a nova mensagem. */
export async function duplicarMensagem(m: Mensagem, opcoes: { titulo?: string; detalhes?: Mensagem['detalhes']; pastaId?: string | null } = {}): Promise<Mensagem> {
  const [t, s] = await Promise.all([
    supabase.from('topicos').select('*').eq('mensagem_id', m.id).order('ordem'),
    supabase.from('slides').select('*').eq('mensagem_id', m.id).order('ordem'),
  ])
  if (t.error) throw t.error

  const { data: nova, error } = await supabase.from('mensagens').insert({
    titulo: opcoes.titulo ?? `${m.titulo || 'Sem título'} (cópia)`,
    texto_base: m.texto_base,
    tempo_minutos: m.tempo_minutos,
    pasta_id: opcoes.pastaId !== undefined ? opcoes.pastaId : m.pasta_id,
    // Formato, objetivo, série… vão junto (sem a marca de "já dada")
    ...(m.tipo === 'estudo' || opcoes.detalhes || (m.detalhes && Object.keys(m.detalhes).length)
      ? { tipo: m.tipo ?? 'pregacao', detalhes: semChaves(opcoes.detalhes ?? m.detalhes ?? {}, ['dadaEm']) }
      : {}),
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
  const ref = (t: string | null) =>
    dividirReferencias(t).map((x) => { const r = parseReferencia(x); return r ? formatarReferencia(r) : x }).join('; ')
  if (m.tipo === 'estudo' || topicos.some((t) => ehBloco(t.tipo))) return estudoEmTexto(m, topicos, ref)
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

/* Roteiro do estudo em texto puro */
function estudoEmTexto(m: Mensagem, blocos: Topico[], ref: (t: string | null) => string) {
  const d = m.detalhes ?? {}
  const linhas: string[] = [`*${m.titulo || 'Sem título'}*`]
  if (d.objetivo) linhas.push(`Objetivo: ${d.objetivo}`)
  const info = [d.publico, `${m.tempo_minutos} min`, d.material].filter(Boolean).join(' · ')
  if (info) linhas.push(info)
  linhas.push('')
  blocos.forEach((b, i) => {
    if (!ehBloco(b.tipo)) {
      linhas.push(`${i + 1}. ${b.titulo || 'Sem título'}${b.versiculo ? ` (${ref(b.versiculo)})` : ''}`)
      for (const c of CAMPOS_TOPICO) {
        if (c.chave === 'notas') continue
        const v = b[c.chave]?.trim()
        if (v) linhas.push(`   ${c.rotulo}: ${v.replace(/\n+/g, ' ')}`)
      }
      linhas.push('')
      return
    }
    const def = defBloco(b)
    const min = b.extra?.minutos ? ` (${b.extra.minutos} min)` : ''
    linhas.push(`${i + 1}. [${def.nome}] ${b.titulo || ''}${min}`)
    if (b.versiculo) linhas.push(`   ${ref(b.versiculo)}`)
    if (b.tipo === 'lista') itensDaLista(b.observacao).forEach((it) => linhas.push(`   • ${it}`))
    else if (b.observacao?.trim()) linhas.push(`   ${b.observacao.trim().replace(/\n+/g, ' ')}`)
    if (b.extra?.autor) linhas.push(`   — ${b.extra.autor}`)
    if (b.extra?.url) linhas.push(`   ${b.extra.url}`)
    linhas.push('')
  })
  return linhas.join('\n').trim()
}

/* Modelo próprio: uma cópia escondida das listas, que aparece em "Criar novo" */
export async function salvarComoModelo(m: Mensagem, nome: string) {
  const detalhes = semChaves(m.detalhes ?? {}, ['serie', 'serieNumero', 'dadaEm'])
  return duplicarMensagem(m, { titulo: nome, detalhes: { ...detalhes, ehModelo: true }, pastaId: null })
}

/* Começa uma mensagem nova a partir de um modelo próprio */
export async function usarModelo(modelo: Mensagem, pastaId: string | null) {
  const detalhes = semChaves(modelo.detalhes ?? {}, ['ehModelo'])
  return duplicarMensagem(modelo, { titulo: modelo.titulo, detalhes, pastaId })
}
