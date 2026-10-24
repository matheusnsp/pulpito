import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, CalendarDays, MessagesSquare, NotebookPen, Plus, Settings } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { identificadorDoUsuario, nomeDoUsuario } from '../lib/usuario'
import Marca from './Marca'
import Tutorial from './Tutorial'
import CriarNovo from './CriarNovo'
import { abrirCriar, aoMudarModo, lerModo } from '../lib/criar'
import { useCriarRapido } from '../lib/criarRapido'

type Item = { para: string; rotulo: string; Icone: typeof BookOpen; fim: boolean; novaAba?: boolean }
const INICIO: Item = { para: '/', rotulo: 'Início', Icone: NotebookPen, fim: true }
const BIBLIA: Item = { para: '/biblia', rotulo: 'Bíblia', Icone: BookOpen, fim: false }
/* Nos estudos, o Banco de perguntas entra no lugar da Bíblia */
const PERGUNTAS: Item = { para: '/perguntas', rotulo: 'Perguntas', Icone: MessagesSquare, fim: false }
const FIM: Item[] = [
  { para: '/agenda', rotulo: 'Agenda', Icone: CalendarDays, fim: false },
  { para: '/ajustes', rotulo: 'Ajustes', Icone: Settings, fim: false },
]

/* Telas de edição: no celular têm a própria barra de topo e escondem a barra de baixo,
   para sobrar espaço e os botões da tela não ficarem atrás dela */
const SEM_TOPO = [/^\/mensagem\//]

export function Avatar({ nome, className = '' }: { nome: string; className?: string }) {
  const iniciais = nome.split(' ').map((p) => p[0]).slice(0, 2).join('') || '?'
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-acao font-display font-bold text-acao-texto ${className}`}>
      {iniciais}
    </span>
  )
}

export default function Layout() {
  const { sessao } = useAuth()
  const { pathname } = useLocation()
  const nome = nomeDoUsuario(sessao?.user)
  const usuario = identificadorDoUsuario(sessao?.user)
  const semTopo = SEM_TOPO.some((r) => r.test(pathname))
  const { criar: criarRapido } = useCriarRapido()
  const nova = () => { if (lerModo() === 'estudo') abrirCriar({ tipo: 'estudo' }); else void criarRapido() }
  const [modo, setModo] = useState(lerModo)
  useEffect(() => aoMudarModo(() => setModo(lerModo())), [])
  const ITENS = [INICIO, modo === 'estudo' ? PERGUNTAS : BIBLIA, ...FIM]

  return (
    <div className="flex h-full">
      {/* Computador: barra lateral */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-borda bg-superficie md:flex">
        <div className="px-5 pb-5 pt-6">
          <Marca icone modo={modo} />
          <p className={`mt-1 pl-[2.1rem] text-[11px] font-extrabold uppercase tracking-[0.14em] ${modo === 'estudo' ? 'text-[#14B8A6]' : 'text-tinta'}`}>
            {modo === 'estudo' ? 'Estudos' : 'Palavra'}
          </p>
        </div>

        <div className="px-3">
          <button onClick={nova} className="botao-primario w-full justify-start">
            <Plus size={18} strokeWidth={2.5} /> {modo === 'estudo' ? 'Novo estudo' : 'Nova mensagem'}
          </button>
          <button onClick={() => abrirCriar({ tipo: modo })} className="mt-1 w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-texto-2 hover:text-texto">
            Outros formatos
          </button>
        </div>

        <nav className="mt-5 flex flex-1 flex-col gap-0.5 px-3">
          {ITENS.map(({ para, rotulo, Icone, fim, novaAba }) => (
            <NavLink key={para} to={para} end={fim} target={novaAba ? '_blank' : undefined}
              className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-colors ${isActive
                ? 'bg-ouro-suave text-texto'
                : 'text-texto-2 hover:bg-superficie-2 hover:text-texto'}`}>
              {({ isActive }) => (
                <>
                  <Icone size={20} strokeWidth={isActive ? 2.4 : 1.9} className={isActive ? 'text-tinta' : ''} />
                  {rotulo}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <Link to="/ajustes" className="m-3 flex items-center gap-3 rounded-2xl border border-borda p-3 hover:bg-superficie-2">
          <Avatar nome={nome} className="h-9 w-9 text-sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{nome}</span>
            <span className="block truncate text-xs text-texto-2">{usuario}</span>
          </span>
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Celular: topo com marca e conta */}
        {!semTopo && (
          <header className="flex shrink-0 items-center justify-between bg-fundo/90 px-3 pb-2 sm:px-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur md:hidden">
            <Marca icone modo={modo} className="text-xl" />
            <Link to="/ajustes" aria-label="Sua conta"><Avatar nome={nome} className="h-9 w-9 text-sm" /></Link>
          </header>
        )}
        <main className={`flex-1 overflow-auto md:pb-0 ${semTopo ? 'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] md:pt-0' : 'pb-28'}`}>
          <Suspense fallback={<div className="flex h-40 items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-[3px] border-borda border-t-acao" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Celular: barra flutuante embaixo, ao alcance do polegar */}
      <Tutorial />
      <CriarNovo />

      {!semTopo && <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 grid grid-cols-4 gap-1 rounded-[1.4rem] border border-borda bg-superficie/90 p-1.5 shadow-cartao backdrop-blur-xl md:hidden">
        {ITENS.map(({ para, rotulo, Icone, fim, novaAba }) => (
          <NavLink key={para} to={para} end={fim} target={novaAba ? '_blank' : undefined}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-bold transition-colors ${isActive ? 'bg-acao text-acao-texto' : 'text-texto-2 active:bg-superficie-2'}`}>
            {({ isActive }) => (
              <>
                <Icone size={21} strokeWidth={isActive ? 2.4 : 1.9} />
                {rotulo}
              </>
            )}
          </NavLink>
        ))}
      </nav>}
    </div>
  )
}
