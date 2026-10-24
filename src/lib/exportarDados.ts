import { supabase } from './supabase'
import { NUMERO_VERSAO } from './atualizar'
import { nomeDoUsuario } from './usuario'

/*
  "Baixar meus dados": um arquivo JSON com tudo o que a pessoa criou.
  É a garantia de que nada fica preso no app. Somente leitura; a importação vem depois.
*/

export type Backup = {
  app: 'Pulpito'
  formato: 1
  versaoApp: string
  exportadoEm: string
  conta: { email: string | null; nome: string }
  dados: Record<string, unknown[]>
}

/* Tabelas da conta e a coluna que liga cada uma à pessoa ou ao projeto */
const TABELAS_DA_CONTA = ['pastas', 'mensagens', 'eventos', 'versiculos_marcados', 'aulas_ao_vivo'] as const
const TABELAS_DO_PROJETO = ['topicos', 'slides', 'versoes'] as const

export const nomeDoArquivoBackup = (data: Date) =>
  `pulpito-backup-${data.toISOString().slice(0, 10)}.json`

export function montarBackup(conta: Backup['conta'], dados: Backup['dados'], agora = new Date()): Backup {
  return { app: 'Pulpito', formato: 1, versaoApp: NUMERO_VERSAO, exportadoEm: agora.toISOString(), conta, dados }
}

/* Em pedaços: o filtro `in` tem limite de tamanho na URL */
export function emLotes<T>(itens: T[], tamanho = 100): T[][] {
  const lotes: T[][] = []
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho))
  return lotes
}

async function todos(tabela: string, coluna?: string, valores?: string[]) {
  if (!coluna) {
    const { data, error } = await supabase.from(tabela).select('*')
    if (error) throw error
    return data ?? []
  }
  const linhas: unknown[] = []
  for (const lote of emLotes(valores ?? [])) {
    const { data, error } = await supabase.from(tabela).select('*').in(coluna, lote)
    if (error) throw error
    linhas.push(...(data ?? []))
  }
  return linhas
}

export async function montarBackupDaConta(): Promise<Backup> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sem sessão')
  const dados: Backup['dados'] = {}
  for (const t of TABELAS_DA_CONTA) dados[t] = await todos(t)
  const ids = (dados.mensagens as { id: string }[]).map((m) => m.id)
  for (const t of TABELAS_DO_PROJETO) dados[t] = await todos(t, 'mensagem_id', ids)
  const aulas = (dados.aulas_ao_vivo as { id: string }[]).map((a) => a.id)
  dados.respostas = await todos('respostas', 'aula_id', aulas)
  return montarBackup({ email: user.email ?? null, nome: nomeDoUsuario(user) }, dados)
}

export function baixarArquivo(nome: string, conteudo: string, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function baixarMeusDados() {
  const backup = await montarBackupDaConta()
  baixarArquivo(nomeDoArquivoBackup(new Date()), JSON.stringify(backup, null, 2))
  return backup
}
