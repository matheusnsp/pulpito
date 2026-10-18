/*
  Força o app a carregar a versão mais nova:
  desliga o service worker, apaga as cópias guardadas (caches) e recarrega.
  O login, o tema e o histórico do ensaio ficam guardados.
*/
export async function carregarUltimaVersao() {
  try {
    const registros = await navigator.serviceWorker?.getRegistrations() ?? []
    await Promise.all(registros.map((r) => r.unregister()))
  } catch { /* navegador sem service worker */ }
  try {
    const nomes = await caches.keys()
    await Promise.all(nomes.map((n) => caches.delete(n)))
  } catch { /* sem cache */ }
  // Endereço diferente, para o navegador não reaproveitar a página guardada
  const url = new URL(window.location.href)
  url.searchParams.set('v', String(Date.now()))
  window.location.replace(url.toString())
}

export const VERSAO_APP = __VERSAO_APP__
