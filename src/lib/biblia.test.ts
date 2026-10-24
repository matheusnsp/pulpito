import { describe, expect, it } from 'vitest'
import { acharLivroPorNome, dividirReferencias, formatarReferencia, parseReferencia } from './biblia'

describe('parseReferencia', () => {
  it('lê livro, capítulo e versículo', () => {
    expect(parseReferencia('Jo 3:16')).toEqual({ livro: 'JHN', capitulo: 3, inicio: 16, fim: undefined })
  })
  it('lê intervalo de versículos com prefixo numérico no livro', () => {
    expect(parseReferencia('1Co 13:4-5')).toEqual({ livro: '1CO', capitulo: 13, inicio: 4, fim: 5 })
  })
  it('aceita ponto como separador de versículo e nome por extenso', () => {
    expect(parseReferencia('Jeremias 29.11')).toMatchObject({ livro: 'JER', capitulo: 29, inicio: 11 })
  })
  it('só capítulo, sem versículo', () => {
    expect(parseReferencia('Sl 23')).toEqual({ livro: 'PSA', capitulo: 23, inicio: undefined, fim: undefined })
  })
  it('diferencia Jó (com acento) de Jo (João)', () => {
    expect(parseReferencia('Jó 1')?.livro).toBe('JOB')
    expect(parseReferencia('Jo 1')?.livro).toBe('JHN')
  })
  it('descarta fim menor que o início', () => {
    expect(parseReferencia('Rm 8:28-20')).toEqual({ livro: 'ROM', capitulo: 8, inicio: 28, fim: undefined })
  })
  it('devolve null para texto que não é referência', () => {
    expect(parseReferencia('texto qualquer')).toBeNull()
    expect(parseReferencia('Xyz 3')).toBeNull()
    expect(parseReferencia('')).toBeNull()
  })
})

describe('acharLivroPorNome', () => {
  it('aceita apelidos comuns', () => {
    expect(acharLivroPorNome('Salmo')).toBe('PSA')
    expect(acharLivroPorNome('Cântico dos Cânticos')).toBe('SNG')
  })
  it('completa pelo começo do nome a partir de 3 letras', () => {
    expect(acharLivroPorNome('jer')).toBe('JER')
    expect(acharLivroPorNome('je')).toBeNull()
  })
  it('ignora acentos, espaços e pontos', () => {
    expect(acharLivroPorNome('genesis')).toBe('GEN')
    expect(acharLivroPorNome('1 Sm.')).toBe('1SA')
  })
})

describe('formatarReferencia', () => {
  it('monta o texto com nome do livro', () => {
    expect(formatarReferencia({ livro: 'JHN', capitulo: 3 })).toBe('João 3')
    expect(formatarReferencia({ livro: 'JHN', capitulo: 3, inicio: 16 })).toBe('João 3:16')
    expect(formatarReferencia({ livro: 'JHN', capitulo: 3, inicio: 16, fim: 18 })).toBe('João 3:16-18')
  })
  it('não repete o versículo quando fim é igual ao início', () => {
    expect(formatarReferencia({ livro: 'ROM', capitulo: 8, inicio: 28, fim: 28 })).toBe('Romanos 8:28')
  })
})

describe('dividirReferencias', () => {
  it('separa por ponto e vírgula ou quebra de linha', () => {
    expect(dividirReferencias('Jo 3:16; Rm 8:28\n Sl 23 ')).toEqual(['Jo 3:16', 'Rm 8:28', 'Sl 23'])
  })
  it('lida com vazio e nulo', () => {
    expect(dividirReferencias(null)).toEqual([])
    expect(dividirReferencias('')).toEqual([])
  })
})
