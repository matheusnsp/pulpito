export default function Marca({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-start font-escritura text-2xl font-semibold tracking-tight text-texto ${className}`}>
      Pulpito
      <span aria-hidden className="ml-0.5 mt-[0.2em] h-[0.22em] w-[0.22em] rounded-full bg-ouro" />
    </span>
  )
}