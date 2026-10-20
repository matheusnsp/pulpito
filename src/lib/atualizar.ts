/*
  Atualização do app.
  - verificarVersao: pergunta ao servidor (/versao.json, nunca guardado) qual é a versão mais nova.
  - aplicarAtualizacao: usa o service worker novo, se já baixou; senão, faz a limpeza completa.
  - carregarUltimaVersao: limpeza completa — desliga o service worker, apaga as cópias guardadas e recarrega.
  O login, o tema e as mensagens não são afetados.
*/

export const VERSAO_APP = __VERSAO_APP__
export const ID_BUILD = __ID_BUILD__

export type InfoVersao = { id: string; versao: string }

export async function verificarVersao(): Promise<{ nova: boolean; remota: InfoVersao } | null> {
  try {
    const r = await fetch(`/versao.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return null
    const remota = (await r.json()) as InfoVersao
    if (!remota?.id) return null
    return { nova: Number(remota.id) > Number(ID_BUILD), remota }
  } catch {
    return null
  }
}

/* Pede ao navegador para baixar o service worker novo, se houver */
export async function buscarServiceWorkerNovo() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations() ?? []
    await Promise.all(regs.map((r) => r.update()))
  } catch { /* sem service worker */ }
}

export async function carregarUltimaVersao() {
  try {
    const registros = await navigator.serviceWorker?.getRegistrations() ?? []
    await Promise.all(registros.map((r) => r.unregister()))
  } catch { /* navegador sem service worker */ }
  try {
    const nomes = await caches.keys()
    // Só apaga o código do app. A Bíblia baixada e a cópia dos dados (supabase-api) ficam:
    // essa cópia é o que permite abrir sem internet e até recuperar algo apagado sem querer.
    await Promise.all(nomes.filter((n) => n !== 'biblia' && n !== 'supabase-api').map((n) => caches.delete(n)))
  } catch { /* sem cache */ }
  // Endereço diferente, para o navegador não reaproveitar a página guardada
  const url = new URL(window.location.href)
  url.searchParams.set('v', String(Date.now()))
  window.location.replace(url.toString())
}

/* "18/10/2026, 22:10" → "18 de out., 22:10" */
export function versaoAmigavel(v: string) {
  const m = v.match(/(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{2}:\d{2})/)
  if (!m) return v
  const mes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m[2]) - 1]
  return `${Number(m[1])} de ${mes}, ${m[4]}`
}

/* Novidades recentes, mostradas em Ajustes. A mais nova primeiro. */
export const NOVIDADES: { titulo: string; texto: string }[] = [
    { titulo: 'Mural no telão', texto: 'Com as respostas ao vivo abertas, avance a partir da pergunta e o telão mostra o QR Code, o código e as respostas chegando.' },
    { titulo: 'Respostas anônimas', texto: 'Escolha o sigilo antes de abrir: ninguém informa o nome e as respostas aparecem sem autor.' },
    { titulo: 'Tutorial completo', texto: 'Reveja tudo em Ajustes › Ver tutorial.' },
  ]
