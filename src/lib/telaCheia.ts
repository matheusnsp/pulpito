/*
  Tela cheia que funciona também no Safari: o iPad usa os comandos com prefixo "webkit".
  O iPhone não deixa nenhum site entrar em tela cheia; lá o caminho é abrir pelo app
  instalado na tela de início (sem as barras do Safari) e deitar o celular.
*/
type DocWebkit = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void; webkitFullscreenEnabled?: boolean }
type ElWebkit = HTMLElement & { webkitRequestFullscreen?: () => void }

export function emTelaCheia() {
  const d = document as DocWebkit
  return !!(document.fullscreenElement || d.webkitFullscreenElement)
}

export function podeTelaCheia() {
  const d = document as DocWebkit
  const el = document.documentElement as ElWebkit
  return !!((document.fullscreenEnabled && el.requestFullscreen) || (d.webkitFullscreenEnabled && el.webkitRequestFullscreen))
}

/* Aberto pelo ícone da tela de início (sem as barras do navegador) */
export function appInstalado() {
  return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/* Entra ou sai da tela cheia. Devolve false quando o aparelho não permite (iPhone). */
export function alternarTelaCheia(): boolean {
  const d = document as DocWebkit
  const el = document.documentElement as ElWebkit
  if (emTelaCheia()) {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
    else d.webkitExitFullscreen?.()
    return true
  }
  if (!podeTelaCheia()) return false
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
  else el.webkitRequestFullscreen?.()
  return true
}

export function aoMudarTelaCheia(fn: () => void) {
  document.addEventListener('fullscreenchange', fn)
  document.addEventListener('webkitfullscreenchange', fn)
  return () => {
    document.removeEventListener('fullscreenchange', fn)
    document.removeEventListener('webkitfullscreenchange', fn)
  }
}
