import { supabase } from './supabase'

const CHAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function suportaNotificacoes() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function chaveParaBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const bin = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export async function inscricaoAtual() {
  if (!suportaNotificacoes()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function ativarNotificacoes(): Promise<'ok' | 'negado' | 'sem-suporte' | 'erro'> {
  if (!suportaNotificacoes() || !CHAVE_PUBLICA) return 'sem-suporte'
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') return 'negado'
  try {
    const reg = await navigator.serviceWorker.ready
    const inscricao = (await reg.pushManager.getSubscription())
      ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chaveParaBytes(CHAVE_PUBLICA),
      })
    const { keys } = inscricao.toJSON()
    const { error } = await supabase.from('push_inscricoes').upsert({
      endpoint: inscricao.endpoint,
      p256dh: keys!.p256dh,
      auth: keys!.auth,
      aparelho: navigator.userAgent.slice(0, 200),
    }, { onConflict: 'endpoint' })
    return error ? 'erro' : 'ok'
  } catch {
    return 'erro'
  }
}

export async function desativarNotificacoes() {
  const inscricao = await inscricaoAtual()
  if (!inscricao) return
  await supabase.from('push_inscricoes').delete().eq('endpoint', inscricao.endpoint)
  await inscricao.unsubscribe()
}

export async function notificacaoDeTeste() {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('Pulpito', {
    body: 'Assim vão chegar os lembretes da sua agenda.',
    icon: '/pwa-192x192.png',
  })
}