import type { CSSProperties, ReactNode } from 'react'
import { ESTILO_PADRAO, type EstiloSlide } from '../lib/tipos'

export type ConteudoSlide = {
  titulo?: string | null
  subtitulo?: string | null
  texto?: string | null
  fundo?: string | null
  estilo?: Partial<EstiloSlide> | null
}

const ESCALA = { p: 0.82, m: 1, g: 1.2 }
const DISPLAY = '"Plus Jakarta Sans Variable", "Atkinson Hyperlegible Next", system-ui, sans-serif'
const SERIF = '"Literata Variable", Georgia, serif'

/* Tamanho do texto pelo comprimento, para nunca estourar o slide (unidades do contêiner) */
function tamanhoPorTexto(t: string, maior: number, menor: number) {
  const n = t.length
  if (n <= 60) return maior
  if (n >= 420) return menor
  return maior - ((n - 60) / 360) * (maior - menor)
}

export default function SlideVisual({ slide, preencher = false, className = '' }: {
  slide: ConteudoSlide
  preencher?: boolean // true no telão: ocupa a tela inteira
  className?: string
}) {
  const e = { ...ESTILO_PADRAO, ...(slide.estilo ?? {}) }
  const k = ESCALA[e.tamanho] ?? 1
  const destaque = e.destaque || '#FFC107'
  const fundo = slide.fundo || '#000000'
  const imagem = fundo.startsWith('img:') ? fundo.slice(4) : null
  const base: CSSProperties = imagem
    ? {
        backgroundColor: '#000000',
        backgroundImage: `url("${imagem}")`,
        backgroundSize: e.ajuste === 'conter' ? 'contain' : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : { background: fundo }
  const titulo = slide.titulo?.trim() ?? ''
  const subtitulo = slide.subtitulo?.trim() ?? ''
  const texto = slide.texto?.trim() ?? ''
  const centro = e.alinhamento === 'center'
  const alinhar = centro ? 'items-center text-center' : 'items-start text-left'
  const layout = e.layout ?? 'livre'

  let miolo: ReactNode

  if (layout === 'capa') {
    miolo = (
      <>
        <span style={{ width: '7cqw', height: '0.7cqw', background: destaque, borderRadius: 99 }} />
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.02, fontSize: `${tamanhoPorTexto(titulo, 7.4, 4.6) * k}cqw` }}>
          {titulo}
        </h1>
        {subtitulo && (
          <p style={{ fontFamily: DISPLAY, fontWeight: 700, color: destaque, fontSize: `${2.6 * k}cqw`, letterSpacing: '0.02em' }}>{subtitulo}</p>
        )}
      </>
    )
  } else if (layout === 'topico') {
    miolo = (
      <>
        {subtitulo && (
          <p style={{ fontFamily: DISPLAY, fontWeight: 800, color: destaque, textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: `${1.9 * k}cqw` }}>
            {subtitulo}
          </p>
        )}
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.04, fontSize: `${tamanhoPorTexto(titulo, 6.6, 4.2) * k}cqw` }}>
          {titulo}
        </h1>
        {texto && (
          <p style={{ fontFamily: DISPLAY, fontWeight: 700, color: destaque, fontSize: `${2.7 * k}cqw` }}>{texto}</p>
        )}
      </>
    )
  } else if (layout === 'versiculo') {
    miolo = (
      <>
        <p style={{ fontFamily: SERIF, lineHeight: 1.38, fontSize: `${tamanhoPorTexto(texto, 4.4, 2.5) * k}cqw`, whiteSpace: 'pre-wrap' }}>
          {texto}
        </p>
        {titulo && (
          <p style={{ fontFamily: DISPLAY, fontWeight: 800, color: destaque, fontSize: `${2.4 * k}cqw`, letterSpacing: '0.02em' }}>{titulo}</p>
        )}
      </>
    )
  } else if (layout === 'frase') {
    miolo = (
      <>
        <span aria-hidden style={{ fontFamily: SERIF, color: destaque, fontSize: `${12 * k}cqw`, lineHeight: 0.6, height: `${5 * k}cqw` }}>“</span>
        <p style={{ fontFamily: DISPLAY, fontWeight: 800, lineHeight: 1.18, letterSpacing: '-0.01em', fontSize: `${tamanhoPorTexto(texto, 5.6, 3.2) * k}cqw`, whiteSpace: 'pre-wrap' }}>
          {texto}
        </p>
        {titulo && <p style={{ color: destaque, fontWeight: 700, fontSize: `${2 * k}cqw` }}>{titulo}</p>}
      </>
    )
  } else {
    // Livre: título, subtítulo e texto, como o usuário montar
    miolo = (
      <>
        {titulo && (
          <h1 style={{ fontFamily: e.fonte === 'serif' ? SERIF : DISPLAY, fontWeight: 800, lineHeight: 1.08, fontSize: `${tamanhoPorTexto(titulo, 6, 4) * k}cqw` }}>{titulo}</h1>
        )}
        {subtitulo && <p style={{ fontSize: `${2.8 * k}cqw`, opacity: 0.8 }}>{subtitulo}</p>}
        {texto && (
          <p style={{ fontSize: `${tamanhoPorTexto(texto, 3.8, 2.4) * k}cqw`, lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{texto}</p>
        )}
      </>
    )
  }

  return (
    <div className={`relative overflow-hidden ${preencher ? 'h-full w-full' : 'aspect-video w-full'} ${className}`}
      style={{ ...base, containerType: 'size' }}>
      {imagem && e.escurecer > 0 && (
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${e.escurecer})` }} />
      )}
      <div className={`relative flex h-full flex-col justify-center overflow-hidden ${alinhar}`}
        style={{
          color: e.cor,
          padding: '6cqh 9cqw',
          gap: '3cqh',
          fontFamily: e.fonte === 'serif' ? SERIF : 'inherit',
        }}>
        {miolo}
      </div>
    </div>
  )
}
