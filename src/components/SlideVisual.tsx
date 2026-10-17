import type { CSSProperties } from 'react'
import { ESTILO_PADRAO, type EstiloSlide } from '../lib/tipos'

export type ConteudoSlide = {
  titulo?: string | null
  subtitulo?: string | null
  texto?: string | null
  fundo?: string | null
  estilo?: Partial<EstiloSlide> | null
}

const ESCALA = { p: 0.8, m: 1, g: 1.25 }

export default function SlideVisual({ slide, preencher = false, className = '' }: {
  slide: ConteudoSlide
  preencher?: boolean // true no telão: ocupa a tela inteira
  className?: string
}) {
  const e = { ...ESTILO_PADRAO, ...(slide.estilo ?? {}) }
  const k = ESCALA[e.tamanho] ?? 1
  const fundo = slide.fundo || '#000000'
  const imagem = fundo.startsWith('img:') ? fundo.slice(4) : null
  const base: CSSProperties = imagem
    ? { backgroundImage: `url("${imagem}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: fundo }
  const texto = slide.texto ?? ''
  const tamTexto = texto.length > 300 ? 2.5 : texto.length > 150 ? 3.1 : 3.8

  return (
    <div className={`relative overflow-hidden ${preencher ? 'h-full w-full' : 'aspect-video w-full'} ${className}`}
      style={{ ...base, containerType: 'size' }}>
      {imagem && <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${e.escurecer})` }} />}
      <div className={`relative flex h-full flex-col justify-center ${e.alinhamento === 'center' ? 'items-center text-center' : 'items-start text-left'}`}
        style={{
          color: e.cor,
          padding: '0 8cqw',
          gap: '3cqh',
          fontFamily: e.fonte === 'serif' ? 'Georgia, "Times New Roman", serif' : 'inherit',
        }}>
        {slide.titulo && (
          <h1 style={{ fontSize: `${6 * k}cqw`, lineHeight: 1.1, fontWeight: 700 }}>{slide.titulo}</h1>
        )}
        {slide.subtitulo && (
          <p style={{ fontSize: `${2.8 * k}cqw`, opacity: 0.8 }}>{slide.subtitulo}</p>
        )}
        {texto && (
          <p style={{ fontSize: `${tamTexto * k}cqw`, lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{texto}</p>
        )}
      </div>
    </div>
  )
}