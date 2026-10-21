import { supabase } from './supabase'

export type PapelProjeto = 'dono' | 'editor' | 'leitor' | null
export type PermissaoConvite = 'editor' | 'leitor'
export type Colaborador = { usuario_id: string; usuario: string; permissao: PermissaoConvite; bloqueado: boolean; adicionado_em: string }
export type Convite = { id: string; permissao: PermissaoConvite; expira_em: string; usos: number; max_usos: number; revogado_em: string | null }
export type PreviaConvite = { titulo: string; permissao: PermissaoConvite; expira_em: string }

export async function papelProjeto(id: string): Promise<PapelProjeto> {
  const { data, error } = await supabase.rpc('pulpito_papel_projeto', { p_mensagem_id: id })
  if (error) throw error
  return (data ?? null) as PapelProjeto
}

export async function criarConvite(id: string, permissao: PermissaoConvite, usos: number) {
  const { data, error } = await supabase.rpc('pulpito_criar_convite', {
    p_mensagem_id: id, p_permissao: permissao, p_max_usos: usos, p_horas: 168,
  })
  if (error) throw error
  const convite = (data as { codigo: string; expira_em: string }[] | null)?.[0]
  if (!convite) throw new Error('Nenhum convite foi gerado')
  return convite
}

export async function preverConvite(codigo: string): Promise<PreviaConvite | null> {
  const { data, error } = await supabase.rpc('pulpito_prever_convite', { p_codigo: codigo })
  if (error) throw error
  return ((data as PreviaConvite[] | null)?.[0]) ?? null
}

export async function aceitarConvite(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc('pulpito_aceitar_convite', { p_codigo: codigo })
  if (error) throw error
  if (!data) throw new Error('Código inválido ou expirado')
  return data as string
}

export async function listarColaboradores(id: string): Promise<Colaborador[]> {
  const { data, error } = await supabase.rpc('pulpito_listar_colaboradores', { p_mensagem_id: id })
  if (error) throw error
  return (data ?? []) as Colaborador[]
}

export async function listarConvites(id: string): Promise<Convite[]> {
  const { data, error } = await supabase.rpc('pulpito_listar_convites', { p_mensagem_id: id })
  if (error) throw error
  return (data ?? []) as Convite[]
}

export async function alterarColaborador(id: string, usuario: string, permissao: PermissaoConvite, bloqueado: boolean) {
  const { error } = await supabase.rpc('pulpito_alterar_colaborador', {
    p_mensagem_id: id, p_usuario_id: usuario, p_permissao: permissao, p_bloqueado: bloqueado,
  })
  if (error) throw error
}

export async function revogarConvite(id: string, conviteId: string) {
  const { error } = await supabase.rpc('pulpito_revogar_convite', { p_mensagem_id: id, p_convite_id: conviteId })
  if (error) throw error
}

export function linkConvite(codigo: string) {
  return `${window.location.origin}/convite/${encodeURIComponent(codigo)}`
}
