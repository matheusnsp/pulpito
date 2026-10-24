import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { identificadorParaEmail, normalizarUsuario, usuarioValido } from '../lib/usuario'
import Marca from '../components/Marca'
import TelaEntrada from '../components/TelaEntrada'
import BotaoGoogle, { entrarComGoogle, googleDisponivel } from '../components/BotaoGoogle'

export default function Login() {
  const { sessao } = useAuth()
  const location = useLocation()
  const destino = (location.state as { de?: string } | null)?.de ?? '/'
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (sessao) return <Navigate to={destino} replace />

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const texto = identificador.trim()
    if (!texto.includes('@') && !usuarioValido(normalizarUsuario(texto))) {
      setErro('Digite seu e-mail ou seu usuário no formato nome.sobrenome.')
      return
    }
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: identificadorParaEmail(texto), password: senha })
    setEnviando(false)
    if (error) {
      setErro(error.message === 'Invalid login credentials'
        ? 'E-mail, usuário ou senha incorretos.'
        : error.message.toLowerCase().includes('confirm')
          ? 'Confirme seu e-mail antes de entrar. Procure a mensagem na caixa de entrada.'
          : 'Não foi possível entrar. Verifique a internet e tente de novo.')
    }
  }

  return (
    <TelaEntrada>
      <div>
        <Marca icone className="text-3xl lg:hidden" />
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight lg:mt-0">Bem-vindo de volta</h1>
        <p className="mt-1.5 text-texto-2">Suas mensagens, a Bíblia e o telão no mesmo lugar.</p>

        <form onSubmit={entrar} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">E-mail ou usuário</span>
            <input type="text" required placeholder="voce@exemplo.com" value={identificador}
              onChange={(e) => setIdentificador(e.target.value)} className="campo"
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between text-sm font-bold">
              Senha
              <Link to="/recuperar-senha" className="text-xs font-semibold text-tinta underline-offset-4 hover:underline">Esqueci a senha</Link>
            </span>
            <input type="password" required autoComplete="current-password"
              value={senha} onChange={(e) => setSenha(e.target.value)} className="campo" />
          </label>
          {erro && <p role="alert" className="text-sm text-perigo">{erro}</p>}
          <button disabled={enviando} className="botao-primario w-full">
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        {googleDisponivel && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs font-semibold text-texto-2">
              <span className="h-px flex-1 bg-borda" /> ou <span className="h-px flex-1 bg-borda" />
            </div>
            <BotaoGoogle onClick={() => entrarComGoogle(destino).catch(() => setErro('Não foi possível abrir o Google. Tente de novo.'))} />
          </>
        )}

        <p className="mt-8 text-center text-sm text-texto-2">
          Ainda não tem conta?{' '}
          <Link to="/criar-conta" className="font-semibold text-tinta underline-offset-4 hover:underline">Criar conta</Link>
        </p>
      </div>
    </TelaEntrada>
  )
}
