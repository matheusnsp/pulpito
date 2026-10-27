import { describe, expect, it } from 'vitest'
import { imagensDoSlide } from './telao'

describe('imagensDoSlide', () => {
  it('pega a foto de fundo dos slides importados de PDF', () => {
    expect(imagensDoSlide({ fundo: 'img:https://x.supabase.co/fundos/a.jpg', estilo: {} })).toEqual(['https://x.supabase.co/fundos/a.jpg'])
  })
  it('pega a foto do slide e as fotos soltas, sem repetir', () => {
    const urls = imagensDoSlide({
      fundo: '#000000',
      estilo: { foto: 'https://x/a.jpg', elementos: [
        { id: '1', tipo: 'foto', url: 'https://x/b.jpg', x: 0, y: 0, w: 1, h: 1 },
        { id: '2', tipo: 'foto', url: 'https://x/a.jpg', x: 0, y: 0, w: 1, h: 1 },
        { id: '3', tipo: 'seta', x: 0, y: 0, w: 1, h: 1 },
      ] },
    })
    expect(urls).toEqual(['https://x/a.jpg', 'https://x/b.jpg'])
  })
  it('ignora cores, degradês e slides sem imagem', () => {
    expect(imagensDoSlide({ fundo: 'linear-gradient(#000, #111)', estilo: null })).toEqual([])
    expect(imagensDoSlide({ fundo: null })).toEqual([])
  })
})
