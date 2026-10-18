import type { CSSProperties } from 'react'
import { Cross } from 'lucide-react'
import type { Elemento } from '../lib/tipos'
import { ICONES } from '../lib/icones'

/* Desenha um elemento solto. Posicionado em % do slide; tamanhos de traço em cqw */
export default function ElementoSlide({ el }: { el: Elemento }) {
  const cor = el.cor || '#FFC107'
  const caixa: CSSProperties = {
    position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`,
    transform: el.rot ? `rotate(${el.rot}deg)` : undefined, transformOrigin: 'center',
  }
  const traco = '0.45cqw'

  switch (el.tipo) {
    case 'foto':
      return <div style={{ ...caixa, borderRadius: '1cqw', backgroundColor: '#111', backgroundImage: el.url ? `url("${el.url}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: '0 1cqw 3cqw rgba(0,0,0,.45)' }} />
    case 'circulo':
      return <div style={{ ...caixa, borderRadius: '50%', border: el.preenchido ? 'none' : `${traco} solid ${cor}`, background: el.preenchido ? cor : 'transparent' }} />
    case 'retangulo':
      return <div style={{ ...caixa, borderRadius: '1.2cqw', border: el.preenchido ? 'none' : `${traco} solid ${cor}`, background: el.preenchido ? cor : 'transparent' }} />
    case 'linha':
      return <div style={caixa}><div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: traco, transform: 'translateY(-50%)', background: cor, borderRadius: 99 }} /></div>
    case 'seta':
      return (
        <div style={caixa}>
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" width="100%" height="100%" style={{ overflow: 'visible' }}>
            <path d="M0 15 H72 V2 L100 20 L72 38 V25 H0 Z" fill={cor} />
          </svg>
        </div>
      )
    case 'icone': {
      const I = ICONES[el.icone ?? 'cruz']?.Icone ?? Cross
      return <div style={caixa}><I width="100%" height="100%" color={cor} strokeWidth={1.75} fill={el.preenchido ? cor : 'none'} /></div>
    }
    case 'texto':
      return (
        <div style={{ ...caixa, color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          fontFamily: '"Plus Jakarta Sans Variable", system-ui, sans-serif', fontWeight: 800, lineHeight: 1.1,
          fontSize: `${Math.max(1.2, el.h * 0.45)}cqh`, whiteSpace: 'pre-wrap', overflow: 'hidden' }}>
          {el.texto || 'Texto'}
        </div>
      )
  }
}
