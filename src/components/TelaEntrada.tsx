import type { ReactNode } from 'react'
import { BookOpen, MonitorPlay, NotebookPen, Timer } from 'lucide-react'
import Marca from './Marca'

const RECURSOS = [
  { Icone: NotebookPen, texto: 'Esboços em tópicos, com versículo, aplicação e ilustração' },
  { Icone: Timer, texto: 'Modo pregação com cronômetro que avisa quando o tempo aperta' },
  { Icone: MonitorPlay, texto: 'Telão sincronizado pelo celular, com código ou QR Code' },
  { Icone: BookOpen, texto: 'Bíblia ARA, ARC e NAA, funcionando sem internet' },
]

/* Moldura das telas de entrar e criar conta */
export default function TelaEntrada({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full">
      {/* Computador: painel da marca */}
      <aside className="relative hidden w-[46%] max-w-xl flex-col justify-between escuro overflow-hidden bg-fundo p-12 text-texto lg:flex">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-acao/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-acao/10 blur-3xl" />
        <div className="relative"><Marca icone className="text-3xl" /></div>
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight">
            Prepare, pregue e projete <span className="text-acao">sem perder o fio.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {RECURSOS.map(({ Icone, texto }) => (
              <li key={texto} className="flex items-start gap-3 text-texto-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-acao">
                  <Icone size={18} />
                </span>
                <span className="pt-1.5">{texto}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-texto-2/70">A inspiração é de Deus. O Pulpito só organiza.</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-entrar">{children}</div>
      </main>
    </div>
  )
}
