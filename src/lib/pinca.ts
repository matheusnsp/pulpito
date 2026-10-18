import { useEffect, useRef, type RefObject } from 'react'

/*
  Pinça para mudar o tamanho da letra.
  Celular: dois dedos afastando/aproximando. Computador: pinça do trackpad (Ctrl + roda).
  Impede o zoom da página inteira dentro do elemento e chama onMudar com a nova escala.
*/
export function usePinca(
  alvo: RefObject<HTMLElement | null>,
  escala: number,
  onMudar: (nova: number) => void,
  { min = 0.75, max = 2.2, pronto = true }: { min?: number; max?: number; pronto?: boolean } = {},
) {
  const atual = useRef(escala)
  const cb = useRef(onMudar)
  useEffect(() => { atual.current = escala }, [escala])
  useEffect(() => { cb.current = onMudar }, [onMudar])

  useEffect(() => {
    const el = alvo.current
    if (!el || !pronto) return
    const limitar = (n: number) => Math.round(Math.min(max, Math.max(min, n)) * 100) / 100
    let inicio: { dist: number; escala: number } | null = null
    const distancia = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    const comecar = (e: TouchEvent) => {
      if (e.touches.length === 2) inicio = { dist: distancia(e.touches), escala: atual.current }
    }
    const mover = (e: TouchEvent) => {
      if (!inicio || e.touches.length !== 2) return
      e.preventDefault()
      cb.current(limitar(inicio.escala * (distancia(e.touches) / inicio.dist)))
    }
    const terminar = (e: TouchEvent) => { if (e.touches.length < 2) inicio = null }
    // Safari no iPhone dispara "gesture*": bloqueia para não dar zoom na página
    const bloquear = (e: Event) => e.preventDefault()
    // Pinça do trackpad chega como roda com Ctrl
    const roda = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      cb.current(limitar(atual.current * Math.exp(-e.deltaY / 200)))
    }

    el.addEventListener('touchstart', comecar, { passive: true })
    el.addEventListener('touchmove', mover, { passive: false })
    el.addEventListener('touchend', terminar)
    el.addEventListener('touchcancel', terminar)
    el.addEventListener('gesturestart', bloquear)
    el.addEventListener('gesturechange', bloquear)
    el.addEventListener('wheel', roda, { passive: false })
    return () => {
      el.removeEventListener('touchstart', comecar)
      el.removeEventListener('touchmove', mover)
      el.removeEventListener('touchend', terminar)
      el.removeEventListener('touchcancel', terminar)
      el.removeEventListener('gesturestart', bloquear)
      el.removeEventListener('gesturechange', bloquear)
      el.removeEventListener('wheel', roda)
    }
  }, [alvo, min, max, pronto])
}
