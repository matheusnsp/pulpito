import { Routes, Route, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { emailParaUsuario } from './lib/usuario'
import Biblia from './pages/Biblia'
import Login from './pages/Login'

const Tela = ({ nome }: { nome: string }) => (
  <div className="p-6 text-xl font-semibold">{nome}</div>
)

function Layout() {
  const { sessao } = useAuth()
  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg ${isActive ? 'bg-neutral-800' : 'text-neutral-400'}`

  return (
    <div className="flex h-full flex-col">
      <nav className="flex items-center gap-1 border-b border-neutral-800 p-2">
        <NavLink to="/" end className={link}>Mensagens</NavLink>
        <NavLink to="/biblia" className={link}>Bíblia</NavLink>
        <NavLink to="/agenda" className={link}>Agenda</NavLink>
        <span className="ml-auto text-sm text-neutral-500">
          {emailParaUsuario(sessao?.user.email)}
        </span>
        <button onClick={() => supabase.auth.signOut()}
          className="px-3 py-2 text-sm text-neutral-500 hover:text-neutral-300">
          Sair
        </button>
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

function Protegido() {
  const { sessao, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return <div className="p-6 text-neutral-500">Carregando…</div>
  if (!sessao) return <Navigate to="/login" replace state={{ de: location.pathname }} />
  return <Layout />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/projetar" element={<Tela nome="Tela do telão" />} />
      <Route element={<Protegido />}>
        <Route path="/" element={<Tela nome="Minhas mensagens" />} />
        <Route path="/mensagem/:id" element={<Tela nome="Editor de mensagem" />} />
        <Route path="/pregar/:id" element={<Tela nome="Modo pregação" />} />
        <Route path="/biblia" element={<Biblia />} />
        <Route path="/agenda" element={<Tela nome="Agenda" />} />
      </Route>
    </Routes>
  )
}