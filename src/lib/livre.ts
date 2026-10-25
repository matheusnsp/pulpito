import { supabase } from './supabase'
import type { Topico } from './tipos'

/*
  Formato Livre: a pessoa escreve um texto corrido, do zero, sem campos pré-definidos.
  Por baixo, o texto vira "partes" (uma por linha que começa com #) gravadas como tópicos,
  então modo pregação, slides, esboço, PDF e versões funcionam sem saber da diferença.
*/
export type Parte = { titulo: string; texto: string }

const TITULO = /^#{1,3}\s*(.*?)\s*$/

export function partesDoTextoLivre(texto: string | null | undefined): Parte[] {
  const partes: Parte[] = []
  let atual: Parte | null = null
  for (const linha of (texto ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const m = linha.match(TITULO)
    if (m) {
      if (atual) partes.push(atual)
      atual = { titulo: m[1], texto: '' }
    } else {
      if (!atual) atual = { titulo: '', texto: '' }
      atual.texto += (atual.texto ? '\n' : '') + linha
    }
  }
  if (atual) partes.push(atual)
  return partes
    .map((p) => ({ titulo: p.titulo.trim(), texto: p.texto.trim() }))
    .filter((p) => p.titulo || p.texto)
}

/* O caminho inverso: tópicos já existentes viram texto, quando a pessoa troca para o Livre */
export function textoDosTopicos(topicos: Topico[]): string {
  return topicos.map((t) => {
    const corpo = [t.observacao, t.ilustracao, t.aplicacao, t.frase_chave].filter((x) => x?.trim()).join('\n\n')
    const cabeca = t.titulo.trim() ? `# ${t.titulo.trim()}` : ''
    const vers = t.versiculo?.trim() ? `[${t.versiculo.trim()}]` : ''
    return [cabeca, vers, corpo].filter(Boolean).join('\n')
  }).join('\n\n')
}

/* Grava as partes como tópicos, mantendo os ids por posição (slides ligados a eles continuam valendo) */
export async function sincronizarPartes(mensagemId: string, partes: Parte[], atuais: Topico[]): Promise<Topico[]> {
  const ordenados = [...atuais].sort((a, b) => a.ordem - b.ordem)
  const resultado: Topico[] = []
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i]
    // Texto antes do primeiro # (quando há outras partes) vira a "Abertura", em vez de ficar sem título
    const titulo = p.titulo || (i === 0 && partes.length > 1 ? 'Abertura' : '')
    const campos = { titulo, observacao: p.texto || null, tipo: 'topico', ordem: i }
    const t = ordenados[i]
    if (t) {
      if (t.titulo !== campos.titulo || (t.observacao ?? null) !== campos.observacao || t.tipo !== 'topico' || t.ordem !== i) {
        const { error } = await supabase.from('topicos').update(campos).eq('id', t.id)
        if (error) throw error
      }
      resultado.push({ ...t, ...campos })
    } else {
      const { data, error } = await supabase.from('topicos').insert({ mensagem_id: mensagemId, ...campos }).select().single()
      if (error || !data) throw error ?? new Error('sem dados')
      resultado.push(data as Topico)
    }
  }
  const sobras = ordenados.slice(partes.length).map((t) => t.id)
  if (sobras.length) {
    const { error } = await supabase.from('topicos').delete().in('id', sobras)
    if (error) throw error
  }
  return resultado
}
