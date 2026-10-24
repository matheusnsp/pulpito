import { describe, expect, it } from 'vitest'
import { PLANO_PADRAO, diasRestantes, emTeste, formatarPreco, linkAssinar, mensagensRestantes, podeCriarMensagem, type EstadoPlano } from './planoInfo'

const agora = new Date('2026-10-24T12:00:00Z')

describe('diasRestantes', () => {
  it('arredonda para cima e zera quando venceu ou não há vencimento', () => {
    expect(diasRestantes('2026-10-25T13:00:00Z', agora)).toBe(2)
    expect(diasRestantes('2026-10-24T12:00:01Z', agora)).toBe(1)
    expect(diasRestantes('2026-10-23T12:00:00Z', agora)).toBe(0)
    expect(diasRestantes(null, agora)).toBe(0)
  })
})

describe('limite de mensagens', () => {
  it('conta o que falta no Gratuito e libera no Premium', () => {
    const gratis: EstadoPlano = { ...PLANO_PADRAO, mensagens_ativas: 3, limite: 5 }
    expect(mensagensRestantes(gratis)).toBe(2)
    expect(podeCriarMensagem(gratis)).toBe(true)
    expect(podeCriarMensagem({ ...gratis, mensagens_ativas: 5 })).toBe(false)
    expect(mensagensRestantes({ ...gratis, mensagens_ativas: 9 })).toBe(0)
    expect(mensagensRestantes({ ...gratis, plano: 'premium', premium: true, mensagens_ativas: 50 })).toBe(Infinity)
  })
  it('emTeste só quando Premium vigente em teste', () => {
    expect(emTeste({ ...PLANO_PADRAO, plano: 'premium', premium: true, status: 'teste' })).toBe(true)
    expect(emTeste({ ...PLANO_PADRAO, plano: 'premium', premium: false, status: 'teste' })).toBe(false)
  })
})

describe('preço e link', () => {
  it('formata em reais', () => {
    expect(formatarPreco(9.9).replace(/\s/g, ' ')).toBe('R$ 9,90')
  })
  it('abre o e-mail do dono com assunto e mensagem prontos', () => {
    const link = linkAssinar('anual', 'Maria', 'm@x.com')!
    expect(link.startsWith('mailto:matheusn.dev@gmail.com?subject=')).toBe(true)
    const corpo = decodeURIComponent(link.split('body=')[1])
    expect(corpo).toContain('anual')
    expect(corpo).toContain('Maria (m@x.com)')
  })
})
