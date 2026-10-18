export default function Marca({ className = '', icone = false }: { className?: string; icone?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-texto ${className}`}>
      {icone && (
        <svg viewBox="0 0 512 512" aria-hidden className="h-[1.25em] w-[1.25em] shrink-0">
          <rect width="512" height="512" rx="120" fill="var(--texto)" />
          <g transform="rotate(-8 256 200)">
            <path d="M256 196c-30-20-70-24-104-18v-34c34-6 74-2 104 18 30-20 70-24 104-18v34c-34-6-74-2-104 18z" fill="var(--acao)" />
            <rect x="128" y="196" width="256" height="32" rx="16" fill="var(--fundo)" />
          </g>
          <path d="M204 252h104l-16 128h-72z" fill="var(--fundo)" />
          <rect x="164" y="384" width="184" height="30" rx="15" fill="var(--fundo)" />
        </svg>
      )}
      <span className="inline-flex items-start">
        Pulpito
        <span aria-hidden className="ml-0.5 mt-[0.18em] h-[0.22em] w-[0.22em] rounded-full bg-acao" />
      </span>
    </span>
  )
}
