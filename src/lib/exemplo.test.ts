import { describe, expect, it, vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: {} }))
const { EXEMPLO } = await import('./exemplo')
import { parseReferencia } from './biblia'

describe('mensagem de exemplo', () => {
  it('tem três tópicos com versículo válido, observação e frase-chave', () => {
    expect(EXEMPLO.topicos).toHaveLength(3)
    expect(parseReferencia(EXEMPLO.texto_base)).not.toBeNull()
    for (const t of EXEMPLO.topicos) {
      expect(parseReferencia(t.versiculo)).not.toBeNull()
      expect(t.observacao.length).toBeGreaterThan(40)
      expect(t.frase_chave.length).toBeGreaterThan(10)
    }
  })
  it('deixa claro no título que é um exemplo', () => {
    expect(EXEMPLO.titulo.startsWith('Exemplo:')).toBe(true)
  })
})
