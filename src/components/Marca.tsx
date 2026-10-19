import type { TipoProjeto } from '../lib/tipos'

/* Cor de cada lado do app: amarelo nas pregações, verde-água nos estudos */
const COR_ESTUDO = '#14B8A6'

/*
  Logo do Pulpito. Sem "modo" é a marca geral (púlpito com a Bíblia aberta em amarelo).
  Com modo="estudo", o mesmo púlpito ganha um capelo e fica verde-água.
*/
export default function Marca({ className = '', icone = false, modo }: { className?: string; icone?: boolean; modo?: TipoProjeto }) {
  const estudo = modo === 'estudo'
  const livro = estudo ? COR_ESTUDO : '#FFC107'
  // No estudo o púlpito desce um pouco para caber o capelo em cima
  const desce = estudo ? 30 : 0
  return (
    <span className={`inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-texto ${className}`}>
      {icone && (
        <svg viewBox="0 0 512 512" aria-hidden className="h-[1.25em] w-[1.25em] shrink-0">
          <rect width="512" height="512" rx="120" fill="#0A0A0A" />
          {estudo && (
            <g transform="translate(256 96)" fill={COR_ESTUDO}>
              <path d="M0 -34 L78 0 L0 34 L-78 0 Z" />
              <path d="M-44 18 V44 Q0 66 44 44 V18 L0 38 Z" opacity=".85" />
              <path d="M60 8 V44" stroke={COR_ESTUDO} strokeWidth="7" strokeLinecap="round" />
              <circle cx="60" cy="50" r="9" />
            </g>
          )}
          <g transform={`translate(0 ${desce}) rotate(-8 256 200)`}>
            <path d="M256 196c-30-20-70-24-104-18v-34c34-6 74-2 104 18 30-20 70-24 104-18v34c-34-6-74-2-104 18z" fill={livro} />
            <rect x="128" y="196" width="256" height="32" rx="16" fill="#F5F5F5" />
          </g>
          <g transform={`translate(0 ${desce})`}>
            <path d="M204 252h104l-16 128h-72z" fill="#F5F5F5" />
            <rect x="164" y="384" width="184" height="30" rx="15" fill="#F5F5F5" />
          </g>
        </svg>
      )}
      <span className="inline-flex items-start">
        Pulpito
        <span aria-hidden className={`ml-0.5 mt-[0.18em] h-[0.22em] w-[0.22em] rounded-full ${estudo ? '' : 'bg-acao'}`}
          style={estudo ? { background: COR_ESTUDO } : undefined} />
      </span>
      {modo && (
        <span className="sr-only">{estudo ? 'Estudos' : 'Palavra'}</span>
      )}
    </span>
  )
}
