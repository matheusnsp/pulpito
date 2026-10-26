import { useRef, useState, type PointerEvent } from 'react'
import { Lock, RotateCw } from 'lucide-react'
import type { Elemento } from '../lib/tipos'

type Canto = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
type Modo = { tipo: 'mover' } | { tipo: 'tamanho'; canto: Canto } | { tipo: 'girar' }
type Guia = { eixo: 'x' | 'y'; pos: number }

const IMA = 1.2 // distância (em % do slide) para grudar numa guia
const lim = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
const arred = (n: number) => Math.round(n * 10) / 10

/* Procura a guia mais próxima para as bordas e o centro do elemento */
function grudar(inicio: number, tam: number, alvos: number[]) {
  let melhor: { delta: number; pos: number } | null = null
  for (const ponto of [inicio, inicio + tam / 2, inicio + tam]) {
    for (const a of alvos) {
      const d = a - ponto
      if (Math.abs(d) <= IMA && (!melhor || Math.abs(d) < Math.abs(melhor.delta))) melhor = { delta: d, pos: a }
    }
  }
  return melhor
}

/*
  Camada transparente por cima do slide no editor: seleciona, move, muda o tamanho
  pelos cantos e lados, gira pela alça de cima e gruda nas guias (bordas e centro
  do slide e dos outros elementos). Durante o gesto avisa por onPreview; ao soltar,
  confirma com onConfirmar (que salva).
*/
export default function CamadaElementos({ elementos, selecionado, onSelecionar, onPreview, onConfirmar, onEditarTexto }: {
  elementos: Elemento[]
  selecionado: string | null
  onSelecionar: (id: string | null) => void
  onPreview: (el: Elemento | null) => void
  onConfirmar: (el: Elemento) => void
  onEditarTexto?: (el: Elemento) => void
}) {
  const area = useRef<HTMLDivElement>(null)
  const gesto = useRef<{ modo: Modo; el: Elemento; x0: number; y0: number; atual: Elemento } | null>(null)
  const [guias, setGuias] = useState<Guia[]>([])

  function comecar(e: PointerEvent, el: Elemento, modo: Modo) {
    e.stopPropagation()
    e.preventDefault()
    onSelecionar(el.id)
    if (el.travado) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    gesto.current = { modo, el, x0: e.clientX, y0: e.clientY, atual: el }
  }

  function mover(e: PointerEvent) {
    const g = gesto.current
    const r = area.current?.getBoundingClientRect()
    if (!g || !r) return
    const dx = ((e.clientX - g.x0) / r.width) * 100
    const dy = ((e.clientY - g.y0) / r.height) * 100
    const el = g.el
    let atual: Elemento
    const novasGuias: Guia[] = []

    if (g.modo.tipo === 'mover') {
      let x = lim(el.x + dx, -el.w + 3, 97)
      let y = lim(el.y + dy, -el.h + 3, 97)
      // Guias: bordas e centro do slide e dos outros elementos
      const outros = elementos.filter((o) => o.id !== el.id && !o.oculto)
      const alvosX = [0, 50, 100, ...outros.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])]
      const alvosY = [0, 50, 100, ...outros.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])]
      const gx = e.altKey ? null : grudar(x, el.w, alvosX)
      const gy = e.altKey ? null : grudar(y, el.h, alvosY)
      if (gx) { x += gx.delta; novasGuias.push({ eixo: 'x', pos: gx.pos }) }
      if (gy) { y += gy.delta; novasGuias.push({ eixo: 'y', pos: gy.pos }) }
      atual = { ...el, x, y }
    } else if (g.modo.tipo === 'tamanho') {
      const c = g.modo.canto
      let { x, y, w, h } = el
      if (c.includes('e')) w = el.w + dx
      if (c.includes('s')) h = el.h + dy
      if (c.includes('w')) { w = el.w - dx; x = el.x + dx }
      if (c.includes('n')) { h = el.h - dy; y = el.y + dy }
      // Shift (ou fotos e ícones pelos cantos) mantém a proporção
      const proporcional = c.length === 2 && (e.shiftKey || el.tipo === 'icone' || el.tipo === 'foto')
      if (proporcional) {
        const k = Math.max(w / el.w, h / el.h)
        const nw = el.w * k, nh = el.h * k
        if (c.includes('w')) x = el.x + el.w - nw
        if (c.includes('n')) y = el.y + el.h - nh
        w = nw; h = nh
      }
      if (w < 2) { if (c.includes('w')) x -= 2 - w; w = 2 }
      if (h < 2) { if (c.includes('n')) y -= 2 - h; h = 2 }
      atual = { ...el, x, y, w: Math.min(w, 200), h: Math.min(h, 200) }
    } else {
      // Girar em volta do centro; gruda a cada 45°
      const cx = r.left + ((el.x + el.w / 2) / 100) * r.width
      const cy = r.top + ((el.y + el.h / 2) / 100) * r.height
      let ang = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90
      if (ang > 180) ang -= 360
      const perto = Math.round(ang / 45) * 45
      if (!e.altKey && Math.abs(ang - perto) < 5) ang = perto
      atual = { ...el, rot: Math.round(ang) }
    }
    g.atual = atual
    setGuias(novasGuias)
    onPreview(atual)
  }

  function soltar() {
    const g = gesto.current
    gesto.current = null
    setGuias([])
    if (!g) return
    onPreview(null)
    if (g.atual !== g.el) onConfirmar({ ...g.atual, x: arred(g.atual.x), y: arred(g.atual.y), w: arred(g.atual.w), h: arred(g.atual.h) })
  }

  const alca = 'absolute h-4 w-4 touch-none rounded-full border-2 border-black bg-[#FFC107] shadow @tsm:h-3.5 @tsm:w-3.5'
  const CANTOS: { c: Canto; pos: string; cursor: string }[] = [
    { c: 'nw', pos: '-left-2 -top-2', cursor: 'cursor-nwse-resize' },
    { c: 'ne', pos: '-right-2 -top-2', cursor: 'cursor-nesw-resize' },
    { c: 'sw', pos: '-left-2 -bottom-2', cursor: 'cursor-nesw-resize' },
    { c: 'se', pos: '-right-2 -bottom-2', cursor: 'cursor-nwse-resize' },
    { c: 'e', pos: '-right-2 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
    { c: 'w', pos: '-left-2 top-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
    { c: 'n', pos: 'left-1/2 -top-2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
    { c: 's', pos: 'left-1/2 -bottom-2 -translate-x-1/2', cursor: 'cursor-ns-resize' },
  ]

  return (
    <div ref={area} className="absolute inset-0" onPointerDown={() => onSelecionar(null)}
      onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
      {elementos.map((el) => {
        const sel = el.id === selecionado
        if (el.oculto && !sel) return null
        return (
          <div key={el.id} onPointerDown={(e) => comecar(e, el, { tipo: 'mover' })}
            onDoubleClick={() => el.tipo === 'texto' && onEditarTexto?.(el)}
            className={`absolute touch-none ${el.travado ? 'cursor-default' : 'cursor-move'} ${sel
              ? 'outline-2 outline-[#FFC107] [outline-style:solid]'
              : 'hover:outline-1 hover:outline-dashed hover:outline-white/60'}`}
            style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`, transform: el.rot ? `rotate(${el.rot}deg)` : undefined }}>
            {sel && el.travado && (
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFC107] text-black"><Lock size={11} /></span>
            )}
            {sel && !el.travado && (
              <>
                {CANTOS.map(({ c, pos, cursor }) => (
                  <span key={c} onPointerDown={(e) => comecar(e, el, { tipo: 'tamanho', canto: c })}
                    aria-label="Mudar o tamanho" className={`${alca} ${pos} ${cursor} ${c.length === 1 ? 'scale-75' : ''}`} />
                ))}
                <span className="pointer-events-none absolute -top-7 left-1/2 h-5 w-px -translate-x-1/2 bg-[#FFC107]" />
                <span onPointerDown={(e) => comecar(e, el, { tipo: 'girar' })} aria-label="Girar"
                  className="absolute -top-10 left-1/2 flex h-6 w-6 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-black bg-[#FFC107] text-black shadow">
                  <RotateCw size={12} strokeWidth={3} />
                </span>
              </>
            )}
          </div>
        )
      })}
      {guias.map((g, i) => (
        <span key={i} className="pointer-events-none absolute bg-[#FF3EA5]"
          style={g.eixo === 'x'
            ? { left: `${g.pos}%`, top: 0, bottom: 0, width: 1 }
            : { top: `${g.pos}%`, left: 0, right: 0, height: 1 }} />
      ))}
    </div>
  )
}
