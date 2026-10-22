import type { Mensagem } from './tipos'

/*
  Séries de mensagens ("Aula 1, 2, 3…"): ficam em detalhes.serie e detalhes.serieNumero.
  "Dada" (detalhes.dadaEm) marca o progresso; é preenchida ao terminar no modo pregação/aula.
*/

export type ResumoSerie = { nome: string; total: number; dadas: number }

export function resumoSeries(lista: Mensagem[]): ResumoSerie[] {
  const mapa = new Map<string, ResumoSerie>()
  for (const m of lista) {
    const nome = m.detalhes?.serie?.trim()
    if (!nome) continue
    const r = mapa.get(nome) ?? { nome, total: 0, dadas: 0 }
    r.total++
    if (m.detalhes?.dadaEm) r.dadas++
    mapa.set(nome, r)
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/* Itens da mesma série, em ordem */
export function daSerie(lista: Pick<Mensagem, 'id' | 'titulo' | 'detalhes'>[], serie: string) {
  return lista.filter((m) => m.detalhes?.serie?.trim() === serie.trim())
    .sort((a, b) => (a.detalhes?.serieNumero ?? 999) - (b.detalhes?.serieNumero ?? 999) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
}

/* Próximo número livre de uma série */
export function proximoNumero(lista: Pick<Mensagem, 'id' | 'titulo' | 'detalhes'>[], serie: string, ignorar?: string) {
  const nums = daSerie(lista, serie).filter((m) => m.id !== ignorar).map((m) => m.detalhes?.serieNumero ?? 0)
  return (nums.length ? Math.max(...nums) : 0) + 1
}
