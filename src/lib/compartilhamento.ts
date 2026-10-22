import { supabase } from './supabase'

export type PapelProjeto = 'dono' | 'editor' | 'leitor' | null
export type PermissaoConvite = 'editor' | 'leitor'
export type Colaborador = { usuario_id: string; usuario: string; permissao: PermissaoConvite; bloqueado: boolean; adicionado_em: string }
export type Convite = { id: string; permissao: PermissaoConvite; expira_em: string; usos: number; max_usos: number; revogado_em: string | null }
export type PreviaConvite = { titulo: string; permissao: PermissaoConvite; expira_em: string }

/**
 * Mantém o controle de acesso do Supabase.
 * Se a RPC de colaboração ainda não estiver disponível ou falhar,
 * o proprietário ainda pode abrir SEUS projetos legados. Apenas o
 * próprio proprietário (user_id == auth.uid()) recebe esse fallback.
 * O SELECT também permanece sujeito à RLS original do banco.
 */
export async function papelProjeto(id: string): Promise<PapelProjeto> {
  const { data, error } = await supabase.rpc('pulpito_papel_projeto', { p_mensagem_id: id })
  if (!error && data) return data as PapelProjeto

  // Não concede permissão a convidados nem a projetos de terceiros.
  // Suporta instalações onde o SQL de colaboração ainda não foi aplicado.
  const { data: autenticacao, error: erroAuth } = await supabase.auth.getUser()
  if (!erroAuth && autenticacao.user) {
    const { data: projeto, error: erroProjeto } = await supabase.from('mensagens')
      .select('user_id').eq('id', id).maybeSingle()
    if (!erroProjeto && projeto?.user_id === autenticacao.user.id) return 'dono'
  }

  if (error) throw error
  return null
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
