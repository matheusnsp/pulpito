import { useRef, type PointerEvent } from 'react'
import type { Elemento } from '../lib/tipos'

type Modo = 'mover' | 'redimensionar'

/*
  Camada transparente por cima do slide no editor: seleciona, arrasta e
  redimensiona os elementos soltos. Durante o arraste avisa por onPreview;
  ao soltar, confirma com onConfirmar (que salva).
*/
export default function CamadaElementos({ elementos, selecionado, onSelecionar, onPreview, onConfirmar }: {
  elementos: Elemento[]
  selecionado: string | null
  onSelecionar: (id: string | null) => void
  onPreview: (el: Elemento | null) => void
  onConfirmar: (el: Elemento) => void
}) {
  const area = useRef<HTMLDivElement>(null)
  const gesto = useRef<{ modo: Modo; el: Elemento; x0: number; y0: number; atual: Elemento } | null>(null)

  function comecar(e: PointerEvent, el: Elemento, modo: Modo) {
    e.stopPropagation()
    e.preventDefault()
    onSelecionar(el.id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    gesto.current = { modo, el, x0: e.clientX, y0: e.clientY, atual: el }
  }

  function mover(e: PointerEvent) {
    const g = gesto.current
    const r = area.current?.getBoundingClientRect()
    if (!g || !r) return
    const dx = ((e.clientX - g.x0) / r.width) * 100
    const dy = ((e.clientY - g.y0) / r.height) * 100
    const lim = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
    const atual = g.modo === 'mover'
      ? { ...g.el, x: lim(g.el.x + dx, -g.el.w + 3, 97), y: lim(g.el.y + dy, -g.el.h + 3, 97) }
      : { ...g.el, w: lim(g.el.w + dx, 3, 100), h: lim(g.el.h + dy, 3, 100) }
    g.atual = atual
    onPreview(atual)
  }

  function soltar() {
    const g = gesto.current
    gesto.current = null
    if (!g) return
    onPreview(null)
    const arred = (n: number) => Math.round(n * 10) / 10
    if (g.atual !== g.el) onConfirmar({ ...g.atual, x: arred(g.atual.x), y: arred(g.atual.y), w: arred(g.atual.w), h: arred(g.atual.h) })
  }

  return (
    <div ref={area} className="absolute inset-0" onPointerDown={() => onSelecionar(null)}
      onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
      {elementos.map((el) => {
        const sel = el.id === selecionado
        return (
          <div key={el.id} onPointerDown={(e) => comecar(e, el, 'mover')}
            className={`absolute cursor-move touch-none rounded-sm ${sel ? 'outline-2 outline-dashed outline-[#FFC107]' : 'hover:outline-1 hover:outline-dashed hover:outline-white/60'}`}
            style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`, transform: el.rot ? `rotate(${el.rot}deg)` : undefined }}>
            {sel && (
              <span onPointerDown={(e) => comecar(e, el, 'redimensionar')} aria-label="Redimensionar"
                className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize touch-none rounded-full border-2 border-black bg-[#FFC107]" />
            )}
          </div>
        )
      })}
    </div>
  )
}
