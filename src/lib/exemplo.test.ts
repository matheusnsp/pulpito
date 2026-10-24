import { describe, expect, it, vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: {} }))
const { EXEMPLO, EXEMPLO_ESTUDO } = await import('./exemplo')
import { ehBloco } from './blocos'
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
  it('o estudo de exemplo usa só blocos do catálogo e mistura explicação, pergunta e atividade', () => {
    const tipos = EXEMPLO_ESTUDO.blocos.map((b) => b.tipo)
    for (const t of tipos) expect(ehBloco(t)).toBe(true)
    for (const esperado of ['explicacao', 'pergunta', 'atividade', 'lista']) expect(tipos).toContain(esperado)
    expect(EXEMPLO_ESTUDO.titulo.startsWith('Exemplo:')).toBe(true)
  })
})
