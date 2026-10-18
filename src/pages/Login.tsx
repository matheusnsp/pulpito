import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { normalizarUsuario, usuarioValido, usuarioParaEmail } from '../lib/usuario'
import Marca from '../components/Marca'

export default function Login() {
  const { sessao } = useAuth()
  const location = useLocation()
  const destino = (location.state as { de?: string } | null)?.de ?? '/'
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (sessao) return <Navigate to={destino} replace />

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const nome = normalizarUsuario(usuario)
    if (!usuarioValido(nome)) { setErro('Digite seu usuário no formato nome.sobrenome.'); return }
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: usuarioParaEmail(nome), password: senha })
    setEnviando(false)
    if (error) {
      setErro(error.message === 'Invalid login credentials'
        ? 'Usuário ou senha incorretos.'
        : 'Não foi possível entrar. Verifique a internet e tente de novo.')
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Marca className="text-4xl" />
        <p className="mt-2 text-texto-2">Suas mensagens, a Bíblia e o telão no mesmo lugar.</p>

        <form onSubmit={entrar} className="mt-10 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Usuário</span>
            <input type="text" required placeholder="nome.sobrenome" value={usuario}
              onChange={(e) => setUsuario(e.target.value)} className="campo"
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Senha</span>
            <input type="password" required autoComplete="current-password"
              value={senha} onChange={(e) => setSenha(e.target.value)} className="campo" />
          </label>
          {erro && <p role="alert" className="text-sm text-perigo">{erro}</p>}
          <button disabled={enviando} className="botao-primario w-full">
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-texto-2">
          Ainda não tem conta?{' '}
          <Link to="/criar-conta" className="font-semibold text-acao underline-offset-4 hover:underline">Criar conta</Link>
        </p>
        <p className="mt-3 text-center text-sm text-texto-2">
          Esqueceu a senha? Peça para quem administra o Pulpito redefinir.
        </p>
      </div>
    </div>
  )
}