import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import CriarConta from './pages/CriarConta'
import Mensagens from './pages/Mensagens'
import EditorMensagem from './pages/EditorMensagem'
import EditorSlides from './pages/EditorSlides'
import Pregar from './pages/Pregar'
import Projetar from './pages/Projetar'
import Conectar from './pages/Conectar'
import Biblia from './pages/Biblia'
import Agenda from './pages/Agenda'
import Ajustes from './pages/Ajustes'

function Protegido() {
  const { sessao, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return <div className="p-6 text-texto-2">Carregando…</div>
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
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="/conectar/:codigo" element={<Conectar />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}