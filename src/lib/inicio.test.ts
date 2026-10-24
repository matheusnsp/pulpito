import { describe, expect, it } from 'vitest'
import { mostrarBusca, mostrarContinuar, mostrarPastas } from './inicio'

describe('tela inicial enxuta', () => {
  it('busca só com biblioteca grande ou busca em andamento', () => {
    expect(mostrarBusca(3, false)).toBe(false)
    expect(mostrarBusca(6, false)).toBe(true)
    expect(mostrarBusca(1, true)).toBe(true)
  })
  it('pastas quando existem, quando filtrando ou com biblioteca grande', () => {
    expect(mostrarPastas(2, 0, false)).toBe(false)
    expect(mostrarPastas(2, 1, false)).toBe(true)
    expect(mostrarPastas(2, 0, true)).toBe(true)
    expect(mostrarPastas(8, 0, false)).toBe(true)
  })
  it('continuar de onde parou só quando a lista já é longa', () => {
    expect(mostrarContinuar(3)).toBe(false)
    expect(mostrarContinuar(4)).toBe(true)
  })
})
