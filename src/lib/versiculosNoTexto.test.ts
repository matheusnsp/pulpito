import { describe, expect, it } from 'vitest'
import { partesDoTexto, referenciasNoTexto } from './versiculosNoTexto'

describe('partesDoTexto', () => {
  it('separa texto e referência entre colchetes', () => {
    expect(partesDoTexto('Deus é amor [1Jo 4:8] e ponto.')).toEqual([
      { tipo: 'texto', texto: 'Deus é amor' },
      { tipo: 'versiculo', ref: '1Jo 4:8' },
      { tipo: 'texto', texto: 'e ponto.' },
    ])
  })
  it('mantém colchetes que não são referência como texto', () => {
    expect(partesDoTexto('veja [isso aqui] ok')).toEqual([{ tipo: 'texto', texto: 'veja [isso aqui] ok' }])
  })
  it('devolve vazio para nulo, indefinido e texto em branco', () => {
    expect(partesDoTexto(null)).toEqual([])
    expect(partesDoTexto(undefined)).toEqual([])
    expect(partesDoTexto('   ')).toEqual([])
  })
})

describe('referenciasNoTexto', () => {
  it('lista só as referências, na ordem', () => {
    expect(referenciasNoTexto('[Jo 3:16] e [Rm 8:28], mas [não isso]')).toEqual(['Jo 3:16', 'Rm 8:28'])
  })
})
