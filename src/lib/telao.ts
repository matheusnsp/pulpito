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
      // Mural de respostas ao vivo: a pergunta, o código para entrar e as respostas chegando (sem nome quando anônimo)
      tipo: 'mural'; titulo: string; codigo: string; link: string; total: number
      respostas: { texto: string; destaque?: boolean; nome?: string }[]
    }
  | {
      tipo: 'personalizado'; titulo?: string | null; subtitulo?: string | null
      texto?: string | null; fundo?: string | null; estilo?: Partial<EstiloSlide> | null
    }

/* Andamento do download das imagens no telão (feito antes da apresentação) */
export type Preparo = { feitas: number; total: number; falhas: number }

/* Todas as imagens que um slide precisa baixar: foto de fundo (img:URL), foto do slide e fotos soltas */
export function imagensDoSlide(s: { fundo?: string | null; estilo?: Partial<EstiloSlide> | null }): string[] {
  const urls: string[] = []
  if (s.fundo?.startsWith('img:')) urls.push(s.fundo.slice(4))
  if (s.estilo?.foto) urls.push(s.estilo.foto)
  for (const el of s.estilo?.elementos ?? []) if (el.tipo === 'foto' && el.url) urls.push(el.url)
  return [...new Set(urls.filter((u) => /^https?:/.test(u)))]
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
  const imagens = useRef<string[]>([])
  const ultimoSinal = useRef(0)
  const [online, setOnline] = useState(false)
  const [preparo, setPreparo] = useState<Preparo | null>(null)

  useEffect(() => {
    if (!codigo) return
    const ch = supabase.channel(canalTelao(codigo), opcoes)
    const sinal = () => { ultimoSinal.current = Date.now(); setOnline(true) }

    // Ao (re)conectar, o telão recebe o slide atual e a lista de imagens para baixar de uma vez
    const mandarEstado = () => {
      ch.send({ type: 'broadcast', event: 'slide', payload: ultimo.current })
      if (imagens.current.length) ch.send({ type: 'broadcast', event: 'preparar', payload: { urls: imagens.current } })
    }
    ch.on('broadcast', { event: 'pedir-estado' }, () => { sinal(); mandarEstado() })
      .on('broadcast', { event: 'presente' }, sinal)
      .on('broadcast', { event: 'preparo' }, ({ payload }) => { sinal(); setPreparo(payload as Preparo) })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          canal.current = ch
          ch.send({ type: 'broadcast', event: 'ola', payload: {} })
          mandarEstado()
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

  /* Pede ao telão que baixe todas as imagens agora, antes da apresentação */
  const preparar = useCallback((urls: string[]) => {
    imagens.current = urls
    if (!urls.length) { setPreparo(null); return }
    setPreparo({ feitas: 0, total: urls.length, falhas: 0 })
    canal.current?.send({ type: 'broadcast', event: 'preparar', payload: { urls } })
  }, [])

  return { online: !!codigo && online, enviar, despedir, preparar, preparo }
}