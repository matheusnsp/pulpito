/*
  Tamanho do texto do aplicativo (Ajustes › Aparência).
  Muda a letra base da página; como o app inteiro é medido a partir dela (rem),
  textos, botões e espaços crescem juntos, sem precisar de zoom.
  O index.html aplica o valor salvo antes de desenhar a tela, para não piscar.
*/
export const TAMANHOS_TEXTO = [
  { id: 'p', rotulo: 'Pequeno', pct: 87.5 },
  { id: 'm', rotulo: 'Normal', pct: 100 },
  { id: 'g', rotulo: 'Grande', pct: 112.5 },
  { id: 'gg', rotulo: 'Muito grande', pct: 125 },
] as const
export type TamanhoTexto = (typeof TAMANHOS_TEXTO)[number]['id']
const CHAVE = 'pulpito-tamanho-texto'

export function lerTamanhoTexto(): TamanhoTexto {
  try {
    const v = localStorage.getItem(CHAVE)
    return TAMANHOS_TEXTO.some((t) => t.id === v) ? (v as TamanhoTexto) : 'm'
  } catch { return 'm' }
}

export function aplicarTamanhoTexto(id: TamanhoTexto) {
  const t = TAMANHOS_TEXTO.find((x) => x.id === id) ?? TAMANHOS_TEXTO[1]
  document.documentElement.style.fontSize = t.pct === 100 ? '' : `${t.pct}%`
}

export function salvarTamanhoTexto(id: TamanhoTexto) {
  try { localStorage.setItem(CHAVE, id) } catch { /* sem armazenamento */ }
  aplicarTamanhoTexto(id)
}

/*
  Sem zoom da página no celular e no tablet: a tela fica fixa como um app.
  A pinça continua funcionando onde ela muda o tamanho da letra (modo pregação e Bíblia),
  porque esses lugares tratam os dois dedos por conta própria.
  No computador nada muda (a pinça do trackpad e o Ctrl + roda continuam).
*/
export function travarZoomNoToque() {
  if (!window.matchMedia?.('(pointer: coarse)').matches) return
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (meta && !/maximum-scale/.test(meta.content)) meta.content += ', maximum-scale=1, user-scalable=no'
  document.documentElement.style.touchAction = 'manipulation' // sem zoom com dois toques
  const bloquear = (e: Event) => e.preventDefault()
  // Safari (iPhone/iPad) ignora o user-scalable: bloqueia o gesto de pinça da página
  document.addEventListener('gesturestart', bloquear, { passive: false })
  document.addEventListener('gesturechange', bloquear, { passive: false })
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault() }, { passive: false })
}
