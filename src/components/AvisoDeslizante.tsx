import { useRef, useState, type PointerEvent, type ReactNode } from 'react'

/*
  Aviso que sai ao arrastar para o lado (ou para baixo), como as notificações do celular.
  `posicao` fica no invólucro (fixed, bottom, left…); `className` é o visual do aviso.
*/
export default function AvisoDeslizante({ posicao, className = '', onDispensar, children }: {
  posicao: string
  className?: string
  onDispensar: () => void
  children: ReactNode
}) {
  const inicio = useRef<{ x: number; y: number; t: number } | null>(null)
  const [desl, setDesl] = useState({ x: 0, y: 0 })
  const [saindo, setSaindo] = useState<'' | 'esq' | 'dir' | 'baixo'>('')
  const [arrastando, setArrastando] = useState(false)

  function comecar(e: PointerEvent<HTMLDivElement>) {
    // Botões dentro do aviso continuam funcionando normalmente
    if ((e.target as HTMLElement).closest('button, a')) return
    inicio.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    setArrastando(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function mover(e: PointerEvent<HTMLDivElement>) {
    if (!inicio.current) return
    const dx = e.clientX - inicio.current.x
    const dy = e.clientY - inicio.current.y
    // Para cima resiste; para o lado e para baixo segue o dedo
    setDesl(Math.abs(dx) >= Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: Math.max(dy, dy / 4) })
  }

  function soltar(e: PointerEvent<HTMLDivElement>) {
    if (!inicio.current) return
    const ms = Math.max(1, e.timeStamp - inicio.current.t)
    inicio.current = null
    setArrastando(false)
    const rapido = Math.abs(desl.x) / ms > 0.5 || desl.y / ms > 0.5
    if (Math.abs(desl.x) > 80 || (rapido && Math.abs(desl.x) > 20)) {
      sair(desl.x < 0 ? 'esq' : 'dir')
    } else if (desl.y > 50 || (rapido && desl.y > 15)) {
      sair('baixo')
    } else {
      setDesl({ x: 0, y: 0 })
    }
  }

  function sair(lado: 'esq' | 'dir' | 'baixo') {
    setSaindo(lado)
    setTimeout(onDispensar, 180)
  }

  const transform = saindo === 'esq' ? 'translateX(-120%)'
    : saindo === 'dir' ? 'translateX(120%)'
    : saindo === 'baixo' ? 'translateY(150%)'
    : `translate(${desl.x}px, ${desl.y}px)`
  const opacidade = saindo ? 0 : 1 - Math.min(0.6, Math.abs(desl.x) / 300 + Math.max(0, desl.y) / 150)

  return (
    <div role="status" className={posicao}>
      <div className="animate-entrar">
      <div onPointerDown={comecar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}
        style={{ transform, opacity: opacidade, transition: arrastando ? 'none' : 'transform 0.18s ease-out, opacity 0.18s ease-out' }}
        className={`touch-none select-none ${className}`}>
        {children}
      </div>
      </div>
    </div>
  )
}
