import { AUTOR } from '../lib/autor'

/* "Criado por Matheus Neves", com link para o site do autor */
export default function Creditos({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-texto-2 ${className}`}>
      Criado por{' '}
      <a href={AUTOR.site} target="_blank" rel="noopener" className="font-bold text-texto underline-offset-4 hover:underline">{AUTOR.nome}</a>
    </p>
  )
}
