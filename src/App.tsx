import { Routes, Route, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { emailParaUsuario } from './lib/usuario'
import { desativarNotificacoes } from './lib/notificacoes'
import Biblia from './pages/Biblia'
import Login from './pages/Login'
import CriarConta from './pages/CriarConta'
import Mensagens from './pages/Mensagens'
import EditorMensagem from './pages/EditorMensagem'
import EditorSlides from './pages/EditorSlides'
import Pregar from './pages/Pregar'
import Projetar from './pages/Projetar'
import Conectar from './pages/Conectar'
import Agenda from './pages/Agenda'

function Layout() {
  const { sessao } = useAuth()
  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg ${isActive ? 'bg-neutral-800' : 'text-neutral-400'}`

  // Ao sair: este aparelho para de receber lembretes desta conta
  // e a cópia offline das mensagens é apagada
  async function sair() {
    await desativarNotificacoes().catch(() => {})
    if ('caches' in window) await caches.delete('supabase-api')
    await supabase.auth.signOut()
  }

  return (
    <div className="flex h-full flex-col">
      <nav className="flex items-center gap-1 border-b border-neutral-800 p-2">
        <NavLink to="/" end className={link}>Mensagens</NavLink>
        <NavLink to="/biblia" className={link}>Bíblia</NavLink>
        <NavLink to="/agenda" className={link}>Agenda</NavLink>
        <span className="ml-auto text-sm text-neutral-500">
          {emailParaUsuario(sessao?.user.email)}
        </span>
        <button onClick={sair}
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
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/criar-conta" element={<CriarConta />} />
      <Route path="/projetar" element={<Projetar />} />
      <Route element={<Protegido />}>
        <Route path="/pregar/:id" element={<Pregar />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Mensagens />} />
          <Route path="/mensagem/:id" element={<EditorMensagem />} />
          <Route path="/mensagem/:id/slides" element={<EditorSlides />} />
          <Route path="/biblia" element={<Biblia />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/conectar/:codigo" element={<Conectar />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}