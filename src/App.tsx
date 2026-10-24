import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import ProjetoGate from './components/ProjetoGate'
import SoPremium from './components/SoPremium'
import EntrarProjeto from './pages/EntrarProjeto'
import CompartilharProjeto from './pages/CompartilharProjeto'
import Login from './pages/Login'
import CriarConta from './pages/CriarConta'
import RecuperarSenha from './pages/RecuperarSenha'
import NovaSenha from './pages/NovaSenha'
const Conheca = lazy(() => import('./pages/Conheca'))
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
const Lixeira = lazy(() => import('./pages/Lixeira'))
const Historico = lazy(() => import('./pages/Historico'))
const Assinatura = lazy(() => import('./pages/Assinatura'))

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
  // Quem chega sem conta pela porta da frente vê a apresentação; links diretos vão para o login
  if (!sessao) return <Navigate to={location.pathname === '/' ? '/conheca' : '/login'} replace state={{ de: location.pathname }} />
  return <Outlet />
}

export default function App() {
  return (
    <Suspense fallback={<Carregando />}>
      <Routes>
        <Route path="/conheca" element={<Conheca />} />
        <Route path="/login" element={<Login />} />
        <Route path="/criar-conta" element={<CriarConta />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/nova-senha" element={<NovaSenha />} />
        <Route path="/projetar" element={<Projetar />} />
        <Route path="/responder" element={<Responder />} />
        <Route path="/responder/:codigo" element={<Responder />} />
        <Route element={<Protegido />}>
          <Route path="/pregar/:id" element={<ProjetoGate><Pregar /></ProjetoGate>} />
          <Route element={<Layout />}>
            <Route path="/" element={<Mensagens />} />
            <Route path="/mensagem/:id" element={<ProjetoGate><EditorMensagem /></ProjetoGate>} />
            <Route path="/mensagem/:id/slides" element={<ProjetoGate><SoPremium recurso="slides" doProjeto><EditorSlides /></SoPremium></ProjetoGate>} />
            <Route path="/mensagem/:id/respostas" element={<ProjetoGate><SoPremium recurso="respostas" doProjeto><RespostasEstudo /></SoPremium></ProjetoGate>} />
            <Route path="/entrar-projeto" element={<EntrarProjeto />} />
            <Route path="/convite/:codigo" element={<EntrarProjeto />} />
            <Route path="/mensagem/:id/compartilhar" element={<SoPremium recurso="colaboracao" doProjeto><CompartilharProjeto /></SoPremium>} />
            <Route path="/biblia" element={<Biblia />} />
            <Route path="/agenda" element={<SoPremium recurso="agenda"><Agenda /></SoPremium>} />
            <Route path="/assinatura" element={<Assinatura />} />
            <Route path="/perguntas" element={<Perguntas />} />
            <Route path="/ajustes" element={<Ajustes />} />
            <Route path="/lixeira" element={<Lixeira />} />
            <Route path="/mensagem/:id/historico" element={<ProjetoGate><SoPremium recurso="historico" doProjeto><Historico /></SoPremium></ProjetoGate>} />
            <Route path="/conectar/:codigo" element={<Conectar />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}