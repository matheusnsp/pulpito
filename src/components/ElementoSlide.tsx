import type { CSSProperties, ReactNode } from 'react'
import { Cross } from 'lucide-react'
import type { Elemento } from '../lib/tipos'
import { ICONES } from '../lib/icones'
import { fonteCss, pesoFixo } from '../lib/fontes'

/* Texto com *palavras marcadas* pintadas na cor de destaque */
export function TextoMarcado({ texto, destaque }: { texto: string; destaque: string }) {
  const partes = texto.split(/(\*[^*\n]+\*)/g)
  return (
    <>
      {partes.map((p, i) => (p.length > 2 && p.startsWith('*') && p.endsWith('*')
        ? <span key={i} style={{ color: destaque }}>{p.slice(1, -1)}</span>
        : <span key={i}>{p}</span>))}
    </>
  )
}

/* Preenchimento: cor única ou degradê com a segunda cor */
const pintura = (cor: string, cor2?: string) => (cor2 ? `linear-gradient(135deg, ${cor}, ${cor2})` : cor)

/* Formas desenhadas em SVG (cabem em qualquer proporção) */
const CAMINHOS: Partial<Record<Elemento['tipo'], string>> = {
  triangulo: 'M50 2 L98 98 L2 98 Z',
  losango: 'M50 2 L98 50 L50 98 L2 50 Z',
  estrela: 'M50 3 L61.8 37.6 L98 38.2 L69 60.4 L79.4 95 L50 74.2 L20.6 95 L31 60.4 L2 38.2 L38.2 37.6 Z',
  balao: 'M14 4 H86 Q96 4 96 14 V60 Q96 70 86 70 H40 L22 94 L26 70 H14 Q4 70 4 60 V14 Q4 4 14 4 Z',
  seta: 'M0 37 H72 V5 L100 50 L72 95 V63 H0 Z',
}

export default function ElementoSlide({ el }: { el: Elemento }) {
  if (el.oculto) return null
  const cor = el.cor || '#FFC107'
  const borda = el.borda ?? 0.45
  const corBorda = el.corBorda || cor
  const sombra = el.sombra ? 'drop-shadow(0 0.6cqw 1.4cqw rgba(0,0,0,.55))' : ''
  const caixa: CSSProperties = {
    position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
    transform: el.rot ? `rotate(${el.rot}deg)` : undefined, transformOrigin: 'center',
    opacity: el.opac ?? 1, filter: sombra || undefined,
  }
  let conteudo: ReactNode = null

  switch (el.tipo) {
    case 'foto': {
      const filtros = [
        el.brilho && el.brilho !== 1 ? `brightness(${el.brilho})` : '',
        el.contraste && el.contraste !== 1 ? `contrast(${el.contraste})` : '',
        el.pb ? 'grayscale(1)' : '',
        el.desfoque ? `blur(${el.desfoque / 10}cqw)` : '',
      ].filter(Boolean).join(' ')
      return (
        <div style={{ ...caixa, filter: el.sombra === false ? undefined : 'drop-shadow(0 1cqw 2.4cqw rgba(0,0,0,.45))' }}>
          <div style={{
            width: '100%', height: '100%',
            borderRadius: el.forma === 'circulo' ? '50%' : `${el.raio ?? 1}cqw`,
            border: el.borda ? `${el.borda}cqw solid ${corBorda}` : undefined,
            backgroundColor: '#111', backgroundImage: el.url ? `url("${el.url}")` : undefined,
            backgroundSize: el.ajuste === 'conter' ? 'contain' : 'cover', backgroundRepeat: 'no-repeat',
            backgroundPosition: `center ${el.focoY ?? 50}%`,
            filter: filtros || undefined,
          }} />
        </div>
      )
    }
    case 'circulo':
    case 'retangulo':
      conteudo = (
        <div style={{
          width: '100%', height: '100%',
          borderRadius: el.tipo === 'circulo' ? '50%' : `${el.raio ?? 1.2}cqw`,
          border: el.preenchido && !el.corBorda ? 'none' : `${borda}cqw solid ${corBorda}`,
          background: el.preenchido ? pintura(cor, el.cor2) : 'transparent',
        }} />
      )
      break
    case 'linha':
      conteudo = <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: `${borda}cqw`, transform: 'translateY(-50%)', background: pintura(cor, el.cor2), borderRadius: 99 }} />
      break
    case 'triangulo':
    case 'losango':
    case 'estrela':
    case 'balao':
    case 'seta': {
      // A seta é sempre cheia (como antes); as outras formas podem ser só contorno
      const cheia = el.tipo === 'seta' || el.preenchido
      const gid = `g${el.id.replace(/[^a-z0-9]/gi, '')}`
      conteudo = (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
          {el.cor2 && (
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={cor} /><stop offset="1" stopColor={el.cor2} /></linearGradient>
            </defs>
          )}
          <path d={CAMINHOS[el.tipo]} vectorEffect="non-scaling-stroke"
            fill={cheia ? (el.cor2 ? `url(#${gid})` : cor) : 'none'}
            stroke={!cheia || el.corBorda ? corBorda : 'none'} strokeLinejoin="round"
            style={{ strokeWidth: `${borda}cqw` }} />
        </svg>
      )
      break
    }
    case 'icone': {
      const I = ICONES[el.icone ?? 'cruz']?.Icone ?? Cross
      conteudo = <I width="100%" height="100%" color={cor} strokeWidth={1.75} fill={el.preenchido ? cor : 'none'} />
      break
    }
    case 'texto': {
      const fixo = pesoFixo(el.fonte)
      // Elementos antigos não têm "tam": o tamanho vinha da altura da caixa
      const tam = el.tam ?? Math.max(1.2, el.h * 0.45) * (9 / 16)
      const justificar = { left: 'flex-start', center: 'center', right: 'flex-end' }[el.alinh ?? 'center']
      const vertical = { top: 'flex-start', center: 'center', bottom: 'flex-end' }[el.alinhV ?? 'center']
      const texto = el.texto || 'Texto'
      const letras: CSSProperties = {
        WebkitTextStroke: el.contorno ? `${Math.max(0.08, tam * 0.045)}cqw ${el.contorno}` : undefined,
        paintOrder: el.contorno ? 'stroke fill' : undefined,
        textShadow: el.sombra ? '0 0.25cqw 1cqw rgba(0,0,0,.65)' : undefined,
      }
      conteudo = (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: vertical, alignItems: justificar, textAlign: el.alinh ?? 'center',
          color: cor, fontFamily: fonteCss(el.fonte), fontWeight: fixo ?? el.peso ?? 800,
          fontStyle: el.italico ? 'italic' : undefined, textDecoration: el.sublinhado ? 'underline' : undefined,
          textUnderlineOffset: '0.15em', textDecorationThickness: '0.07em',
          fontSize: `${tam}cqw`, lineHeight: el.entrelinha ?? 1.15, letterSpacing: el.espaco ? `${el.espaco}em` : undefined,
          textTransform: el.caixaAlta ? 'uppercase' : undefined, whiteSpace: 'pre-wrap', overflowWrap: 'break-word',
        }}>
          <span style={{
            ...letras,
            ...(el.faixa ? { background: el.faixa, padding: '0.08em 0.32em', borderRadius: '0.12em', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } : {}),
          }}>
            <TextoMarcado texto={texto} destaque={el.destaque || '#FFC107'} />
          </span>
        </div>
      )
      // A sombra do texto já vai nas letras
      return <div style={{ ...caixa, filter: undefined }}>{conteudo}</div>
    }
  }
  return <div style={caixa}>{conteudo}</div>
}
