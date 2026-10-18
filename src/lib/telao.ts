import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { EstiloSlide } from './tipos'

export type SlideTelao =
  | { tipo: 'vazio' }
  | { tipo: 'capa'; titulo: string; referencia?: string; textoVersiculo?: string }
  | {
      tipo: 'topico'; titulo: string; numero: number; total: number
      referencia?: string; textoVersiculo?: string; frase?: string
    }
  | { tipo: 'versiculo'; referencia: string; texto: string; versos?: { n: number; t: string }[] }
  | {
      tipo: 'personalizado'; titulo?: string | null; subtitulo?: string | null
      texto?: string | null; fundo?: string | null; estilo?: Partial<EstiloSlide> | null
    }

export const CHAVE_TELAO = 'pulpito-telao'
export const canalTelao = (codigo: string) => `telao-${codigo}`
export const codigoValido = (c: string) => /^\d{6}$/.test(c)

export function gerarCodigo() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

const opcoes = { config: { broadcast: { self: false } } }

/* Lado do celular: envia os slides e sabe se o telão está online */
export function useEmissorTelao(codigo: string | null) {
  const canal = useRef<RealtimeChannel | null>(null)
  const ultimo = useRef<SlideTelao>({ tipo: 'vazio' })
  const ultimoSinal = useRef(0)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    if (!codigo) return
    const ch = supabase.channel(canalTelao(codigo), opcoes)
    const sinal = () => { ultimoSinal.current = Date.now(); setOnline(true) }

    ch.on('broadcast', { event: 'pedir-estado' }, () => {
        sinal()
        ch.send({ type: 'broadcast', event: 'slide', payload: ultimo.current })
      })
      .on('broadcast', { event: 'presente' }, sinal)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          canal.current = ch
          ch.send({ type: 'broadcast', event: 'ola', payload: {} })
          ch.send({ type: 'broadcast', event: 'slide', payload: ultimo.current })
        }
      })

    // Se o telão parar de dar sinal por 25s, considera desconectado
    const verificador = setInterval(() => {
      if (Date.now() - ultimoSinal.current > 25_000) setOnline(false)
    }, 5_000)

    return () => {
      clearInterval(verificador)
      canal.current = null
      supabase.removeChannel(ch)
    }
  }, [codigo])

  const enviar = useCallback((slide: SlideTelao) => {
    ultimo.current = slide
    canal.current?.send({ type: 'broadcast', event: 'slide', payload: slide })
  }, [])

  const despedir = useCallback(() => {
    canal.current?.send({ type: 'broadcast', event: 'tchau', payload: {} })
  }, [])

  return { online: !!codigo && online, enviar, despedir }
}