import { NavLink, Outlet } from 'react-router-dom'
import { BookOpen, CalendarDays, NotebookPen, Settings } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { emailParaUsuario, nomeDeExibicao } from '../lib/usuario'
import Marca from './Marca'

const ITENS = [
  { para: '/', rotulo: 'Mensagens', Icone: NotebookPen, fim: true },
  { para: '/biblia', rotulo: 'Bíblia', Icone: BookOpen, fim: false },
  { para: '/agenda', rotulo: 'Agenda', Icone: CalendarDays, fim: false },
  { para: '/ajustes', rotulo: 'Ajustes', Icone: Settings, fim: false },
]

export default function Layout() {
  const { sessao } = useAuth()
  const nome = nomeDeExibicao(emailParaUsuario(sessao?.user.email))

  return (
    <div className="flex h-full">
      {/* Computador: barra lateral */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-borda bg-superficie md:flex">
        <div className="px-5 py-6"><Marca /></div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {ITENS.map(({ para, rotulo, Icone, fim }) => (
            <NavLink key={para} to={para} end={fim}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${isActive
                ? 'bg-superficie-2 font-semibold text-texto'
                : 'text-texto-2 hover:bg-superficie-2/60 hover:text-texto'}`}>
              {({ isActive }) => (
                <>
                  <Icone size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                  {rotulo}
                  {isActive && <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-ouro" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <p className="truncate px-5 py-5 text-sm text-texto-2">{nome}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Celular: topo só com a marca */}
        <header className="flex h-14 shrink-0 items-center border-b border-borda bg-superficie px-4 md:hidden">
          <Marca className="text-xl" />
        </header>
        <main className="flex-1 overflow-auto pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Celular: barra embaixo, ao alcance do polegar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-borda bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ITENS.map(({ para, rotulo, Icone, fim }) => (
          <NavLink key={para} to={para} end={fim}
            className={({ isActive }) => `relative flex flex-col items-center gap-1 pb-2 pt-3 text-xs ${isActive ? 'font-semibold text-acao' : 'text-texto-2'}`}>
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden className="absolute top-1 h-1 w-1 rounded-full bg-ouro" />}
                <Icone size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                {rotulo}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}