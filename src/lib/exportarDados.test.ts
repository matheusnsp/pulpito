import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))
vi.mock('./atualizar', () => ({ NUMERO_VERSAO: '9.9.9' }))

const { emLotes, montarBackup, nomeDoArquivoBackup } = await import('./exportarDados')

describe('backup dos dados', () => {
  it('nomeia o arquivo pela data', () => {
    expect(nomeDoArquivoBackup(new Date('2026-10-24T15:00:00Z'))).toBe('pulpito-backup-2026-10-24.json')
  })
  it('monta o cabeçalho com versão, data e conta', () => {
    const b = montarBackup({ email: 'x@y.com', nome: 'X' }, { mensagens: [{ id: '1' }] }, new Date('2026-10-24T15:00:00Z'))
    expect(b).toMatchObject({ app: 'Pulpito', formato: 1, versaoApp: '9.9.9', exportadoEm: '2026-10-24T15:00:00.000Z' })
    expect(b.dados.mensagens).toHaveLength(1)
  })
  it('divide listas em lotes', () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(emLotes([])).toEqual([])
  })
})
