export default function Marca({ className = '', icone = false }: { className?: string; icone?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-texto ${className}`}>
      {icone && (
        <svg viewBox="0 0 512 512" aria-hidden className="h-[1.25em] w-[1.25em] shrink-0">
          <rect width="512" height="512" rx="120" fill="var(--texto)" />
          <path d="M256 176c-38-26-92-34-140-28v208c48-6 102 2 140 28 38-26 92-34 140-28V148c-48-6-102 2-140 28z"
            fill="none" stroke="var(--fundo)" strokeWidth="28" strokeLinejoin="round" />
          <path d="M256 176v208" stroke="var(--fundo)" strokeWidth="28" strokeLinecap="round" />
          <circle cx="256" cy="108" r="26" fill="var(--acao)" />
        </svg>
      )}
      <span className="inline-flex items-start">
        Pulpito
        <span aria-hidden className="ml-0.5 mt-[0.18em] h-[0.22em] w-[0.22em] rounded-full bg-acao" />
      </span>
    </span>
  )
}
