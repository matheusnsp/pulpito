import { supabase } from './supabase'
import { desativarNotificacoes } from './notificacoes'

/* Ao sair: o aparelho para de receber lembretes desta conta e a cópia offline é apagada */
export async function sairDaConta() {
  await desativarNotificacoes().catch(() => {})
  if ('caches' in window) await caches.delete('supabase-api')
  await supabase.auth.signOut()
}