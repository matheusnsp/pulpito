import { describe, expect, it } from 'vitest'
import { BLOCOS, MODELOS, ORDEM_BLOCOS, defBloco, ehBloco, itensDaLista, nomeFormato } from './blocos'

describe('catálogo de blocos', () => {
  it('ORDEM_BLOCOS cobre todos os blocos, sem repetir', () => {
    expect([...ORDEM_BLOCOS].sort()).toEqual(Object.keys(BLOCOS).sort())
    expect(new Set(ORDEM_BLOCOS).size).toBe(ORDEM_BLOCOS.length)
  })
  it('ehBloco reconhece só tipos do catálogo', () => {
    expect(ehBloco('pergunta')).toBe(true)
    expect(ehBloco('topico')).toBe(false)
    expect(ehBloco(undefined)).toBe(false)
  })
  it('defBloco cai em explicação para tipo desconhecido', () => {
    expect(defBloco({ tipo: 'inexistente' })).toBe(BLOCOS.explicacao)
    expect(defBloco({ tipo: 'citacao' })).toBe(BLOCOS.citacao)
  })
})

describe('itensDaLista', () => {
  it('aceita marcadores -, • e *, e ignora linhas vazias', () => {
    expect(itensDaLista('- Gastar\n• Guardar\n* Doar\n\n  Investir  ')).toEqual(['Gastar', 'Guardar', 'Doar', 'Investir'])
    expect(itensDaLista(null)).toEqual([])
  })
})

describe('modelos prontos', () => {
  it('têm ids únicos e só usam blocos do catálogo', () => {
    const ids = MODELOS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const m of MODELOS) for (const b of m.blocos) expect(ehBloco(b.tipo)).toBe(true)
  })
  it('nomeFormato cai em Pregação por padrão', () => {
    expect(nomeFormato('celula')).toBe('Célula')
    expect(nomeFormato('livre')).toBe('Livre')
    expect(nomeFormato(undefined)).toBe('Pregação')
  })
})
