import { supabase } from './supabase'
import { desativarNotificacoes } from './notificacoes'

/* Ao sair: o aparelho para de receber lembretes desta conta e a cópia offline é apagada */
export async function sairDaConta() {
  await desativarNotificacoes().catch(() => {})
  if ('caches' in window) await caches.delete('supabase-api')
  await supabase.auth.signOut()
}
/*
  Excluir a conta: primeiro as fotos do bucket (a Storage API apaga o arquivo de verdade;
  pela função SQL sobraria arquivo órfão), depois o usuário, e por fim a sessão deste aparelho.
*/
export async function excluirMinhaConta() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sem sessão')
  const { data: arquivos } = await supabase.storage.from('fundos').list(user.id, { limit: 1000 })
  if (arquivos?.length) {
    await supabase.storage.from('fundos').remove(arquivos.map((a) => `${user.id}/${a.name}`))
  }
  const { error } = await supabase.rpc('excluir_minha_conta')
  if (error) throw error
  await sairDaConta()
}

/* Conta que entra com senha (e-mail ou usuário antigo). Quem só usa Google não tem senha para confirmar. */
export function contaTemSenha(user: { app_metadata?: { providers?: string[]; provider?: string } } | null | undefined) {
  const p = user?.app_metadata?.providers ?? (user?.app_metadata?.provider ? [user.app_metadata.provider] : [])
  return p.length === 0 || p.includes('email')
}
