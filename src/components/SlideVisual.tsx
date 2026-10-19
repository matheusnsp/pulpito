import type { CSSProperties, ReactNode } from 'react'
import { ESTILO_PADRAO, type EstiloSlide } from '../lib/tipos'
import ElementoSlide, { TextoMarcado } from './ElementoSlide'
import { fonteCss } from '../lib/fontes'

export type ConteudoSlide = {
  titulo?: string | null
  subtitulo?: string | null
  texto?: string | null
  fundo?: string | null
  estilo?: Partial<EstiloSlide> | null
}

const ESCALA = { p: 0.82, m: 1, g: 1.2 }
const DISPLAY_PADRAO = '"Plus Jakarta Sans Variable", "Atkinson Hyperlegible Next", system-ui, sans-serif'
const SERIF_PADRAO = '"Literata Variable", Georgia, serif'

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
  const k0 = ESCALA[e.tamanho] ?? 1
  const destaque = e.destaque || '#FFC107'
  const fundo = slide.fundo || '#000000'
  const fotoNoFundo = fundo.startsWith('img:') ? fundo.slice(4) : null
  const foto = e.foto || fotoNoFundo
  const disp = foto ? (e.disposicao && e.disposicao !== 'texto' ? e.disposicao : fotoNoFundo ? 'fundo' : 'esquerda') : 'texto'
  const lateral = disp === 'esquerda' || disp === 'direita'
  const tam = Math.min(0.7, Math.max(0.25, e.fotoTam ?? 0.5))
  const estiloFoto = (url: string): CSSProperties => ({
    backgroundColor: '#000000',
    backgroundImage: `url("${url}")`,
    backgroundSize: e.ajuste === 'conter' ? 'contain' : 'cover',
    backgroundPosition: `center ${e.fotoPos ?? 'center'}`,
    backgroundRepeat: 'no-repeat',
  })
  // Fundo do slide: a foto (quando é "foto de fundo") ou a cor/degradê escolhido
  const base: CSSProperties = disp === 'fundo' || disp === 'so-foto'
    ? estiloFoto(foto!)
    : { background: fotoNoFundo ? '#000000' : fundo }
  // Texto encolhe quando divide o espaço com a foto
  const kTexto = lateral ? Math.min(1, (1 - tam) * 1.45) : disp === 'cima' ? 0.78 : 1
  const titulo = slide.titulo?.trim() ?? ''
  const subtitulo = slide.subtitulo?.trim() ?? ''
  const texto = slide.texto?.trim() ?? ''
  const centro = e.alinhamento === 'center'
  const alinhar = centro ? 'items-center text-center' : 'items-start text-left'
  const layout = e.layout ?? 'livre'

  const k = k0 * kTexto
  // Fontes escolhidas no slide (senão, as padrões de cada modelo)
  const DISPLAY = e.fonteTitulo ? fonteCss(e.fonteTitulo) : DISPLAY_PADRAO
  const SERIF = e.fonteTexto ? fonteCss(e.fonteTexto) : SERIF_PADRAO
  // *palavra* entre asteriscos aparece na cor de destaque
  const m = (t: string) => <TextoMarcado texto={t} destaque={destaque} />
  let miolo: ReactNode

  if (layout === 'vazio') {
    // Tudo é feito com elementos livres
    miolo = null
  } else if (layout === 'capa') {
    miolo = (
      <>
        <span style={{ width: '7cqw', height: '0.7cqw', background: destaque, borderRadius: 99 }} />
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.02, fontSize: `${tamanhoPorTexto(titulo, 7.4, 4.6) * k}cqw` }}>
          {m(titulo)}
        </h1>
        {subtitulo && (
          <p style={{ fontFamily: DISPLAY, fontWeight: 700, color: destaque, fontSize: `${2.6 * k}cqw`, letterSpacing: '0.02em' }}>{m(subtitulo)}</p>
        )}
      </>
    )
  } else if (layout === 'topico') {
    miolo = (
      <>
        {subtitulo && (
          <p style={{ fontFamily: DISPLAY, fontWeight: 800, color: destaque, textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: `${1.9 * k}cqw` }}>
            {m(subtitulo)}
          </p>
        )}
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.04, fontSize: `${tamanhoPorTexto(titulo, 6.6, 4.2) * k}cqw` }}>
          {m(titulo)}
        </h1>
        {texto && (
          <p style={{ fontFamily: DISPLAY, fontWeight: 700, color: destaque, fontSize: `${2.7 * k}cqw` }}>{m(texto)}</p>
        )}
      </>
    )
  } else if (layout === 'versiculo') {
    miolo = (
      <>
        <p style={{ fontFamily: SERIF, lineHeight: 1.38, fontSize: `${tamanhoPorTexto(texto, 4.4, 2.5) * k}cqw`, whiteSpace: 'pre-wrap' }}>
          {m(texto)}
        </p>
        {titulo && (
          <p style={{ fontFamily: DISPLAY, fontWeight: 800, color: destaque, fontSize: `${2.4 * k}cqw`, letterSpacing: '0.02em' }}>{m(titulo)}</p>
        )}
      </>
    )
  } else if (layout === 'frase') {
    miolo = (
      <>
        <span aria-hidden style={{ fontFamily: SERIF, color: destaque, fontSize: `${12 * k}cqw`, lineHeight: 0.6, height: `${5 * k}cqw` }}>“</span>
        <p style={{ fontFamily: DISPLAY, fontWeight: 800, lineHeight: 1.18, letterSpacing: '-0.01em', fontSize: `${tamanhoPorTexto(texto, 5.6, 3.2) * k}cqw`, whiteSpace: 'pre-wrap' }}>
          {m(texto)}
        </p>
        {titulo && <p style={{ color: destaque, fontWeight: 700, fontSize: `${2 * k}cqw` }}>{m(titulo)}</p>}
      </>
    )
  } else {
    // Livre: título, subtítulo e texto, como o usuário montar
    miolo = (
      <>
        {titulo && (
          <h1 style={{ fontFamily: e.fonte === 'serif' && !e.fonteTitulo ? SERIF_PADRAO : DISPLAY, fontWeight: 800, lineHeight: 1.08, fontSize: `${tamanhoPorTexto(titulo, 6, 4) * k}cqw` }}>{m(titulo)}</h1>
        )}
        {subtitulo && <p style={{ fontSize: `${2.8 * k}cqw`, opacity: 0.8 }}>{m(subtitulo)}</p>}
        {texto && (
          <p style={{ fontFamily: e.fonteTexto ? SERIF : undefined, fontSize: `${tamanhoPorTexto(texto, 3.8, 2.4) * k}cqw`, lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{m(texto)}</p>
        )}
      </>
    )
  }

  const caixaTexto = (
    <div className={`relative flex min-w-0 flex-1 flex-col justify-center overflow-hidden ${alinhar}`}
      style={{
        color: e.cor,
        padding: lateral ? '6cqh 5cqw' : disp === 'cima' ? '3cqh 8cqw 5cqh' : '6cqh 9cqw',
        gap: lateral || disp === 'cima' ? '2.2cqh' : '3cqh',
        fontFamily: e.fonte === 'serif' ? SERIF : 'inherit',
      }}>
      {miolo}
    </div>
  )

  return (
    <div className={`relative overflow-hidden ${preencher ? 'h-full w-full' : 'aspect-video w-full'} ${className}`}
      style={{ ...base, containerType: 'size' }}>
      {disp === 'fundo' && e.escurecer > 0 && (
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${e.escurecer})` }} />
      )}
      {disp === 'so-foto' || layout === 'vazio' ? null : lateral || disp === 'cima' ? (
        <div className={`relative flex h-full ${disp === 'cima' ? 'flex-col' : disp === 'direita' ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="shrink-0" style={{
            ...estiloFoto(foto!),
            [disp === 'cima' ? 'height' : 'width']: `${tam * 100}%`,
          }} />
          {caixaTexto}
        </div>
      ) : (
        <div className="relative flex h-full">{caixaTexto}</div>
      )}
      {e.elementos?.map((el) => <ElementoSlide key={el.id} el={el} />)}
    </div>
  )
}
