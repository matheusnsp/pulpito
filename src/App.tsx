import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import CriarConta from './pages/CriarConta'
import Mensagens from './pages/Mensagens'
const EditorMensagem = lazy(() => import('./pages/EditorMensagem'))
const EditorSlides = lazy(() => import('./pages/EditorSlides'))
const Pregar = lazy(() => import('./pages/Pregar'))
const Projetar = lazy(() => import('./pages/Projetar'))
const Conectar = lazy(() => import('./pages/Conectar'))
const Biblia = lazy(() => import('./pages/Biblia'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Ajustes = lazy(() => import('./pages/Ajustes'))
const Perguntas = lazy(() => import('./pages/Perguntas'))
const Responder = lazy(() => import('./pages/Responder'))
const RespostasEstudo = lazy(() => import('./pages/RespostasEstudo'))

function Carregando() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-label="Carregando">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-borda border-t-acao" />
    </div>
  )
}

function Protegido() {
  const { sessao, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return <Carregando />
  if (!sessao) return <Navigate to="/login" replace state={{ de: location.pathname }} />
  return <Outlet />
}

export default function App() {
  return (
    <Suspense fallback={<Carregando />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/criar-conta" element={<CriarConta />} />
        <Route path="/projetar" element={<Projetar />} />
        <Route path="/responder" element={<Responder />} />
        <Route path="/responder/:codigo" element={<Responder />} />
        <Route element={<Protegido />}>
          <Route path="/pregar/:id" element={<Pregar />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Mensagens />} />
            <Route path="/mensagem/:id" element={<EditorMensagem />} />
            <Route path="/mensagem/:id/slides" element={<EditorSlides />} />
            <Route path="/mensagem/:id/respostas" element={<RespostasEstudo />} />
            <Route path="/biblia" element={<Biblia />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/perguntas" element={<Perguntas />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/conectar/:codigo" element={<Conectar />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}