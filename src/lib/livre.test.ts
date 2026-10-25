import { describe, expect, it, vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: {} }))
const { partesDoTextoLivre, textoDosTopicos } = await import('./livre')
import type { Topico } from './tipos'

describe('partesDoTextoLivre', () => {
  it('cada linha com # abre uma parte; o que vem antes vira parte sem título', () => {
    expect(partesDoTextoLivre('Abertura\n\n# A graça\nTexto 1\n\n## A fé\nTexto 2')).toEqual([
      { titulo: '', texto: 'Abertura' },
      { titulo: 'A graça', texto: 'Texto 1' },
      { titulo: 'A fé', texto: 'Texto 2' },
    ])
  })
  it('texto sem título vira uma parte só; vazio vira nada', () => {
    expect(partesDoTextoLivre('Só um parágrafo.\nOutro.')).toEqual([{ titulo: '', texto: 'Só um parágrafo.\nOutro.' }])
    expect(partesDoTextoLivre('')).toEqual([])
    expect(partesDoTextoLivre('\n\n')).toEqual([])
    expect(partesDoTextoLivre(null)).toEqual([])
  })
  it('aceita quebras de linha do Windows e títulos vazios', () => {
    expect(partesDoTextoLivre('# Um\r\nA\r\n#\r\nB')).toEqual([{ titulo: 'Um', texto: 'A' }, { titulo: '', texto: 'B' }])
  })
})

describe('textoDosTopicos', () => {
  it('monta o texto com título, versículo entre colchetes e os campos preenchidos', () => {
    const t = { id: '1', mensagem_id: 'm', ordem: 0, titulo: 'Ponto', versiculo: 'Jo 3:16', observacao: 'Obs', aplicacao: 'Apl', ilustracao: null, frase_chave: null, notas: 'só eu' } as Topico
    expect(textoDosTopicos([t])).toBe('# Ponto\n[Jo 3:16]\nObs\n\nApl')
  })
  it('ida e volta mantém as partes', () => {
    const texto = '# A\nTexto a\n\n# B\nTexto b'
    const partes = partesDoTextoLivre(texto)
    const topicos = partes.map((p, i) => ({ id: String(i), mensagem_id: 'm', ordem: i, titulo: p.titulo, observacao: p.texto, versiculo: null, aplicacao: null, ilustracao: null, frase_chave: null, notas: null })) as Topico[]
    expect(partesDoTextoLivre(textoDosTopicos(topicos))).toEqual(partes)
  })
})
