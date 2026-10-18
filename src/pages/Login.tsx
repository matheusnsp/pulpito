import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { normalizarUsuario, usuarioValido, usuarioParaEmail } from '../lib/usuario'
import Marca from '../components/Marca'
import TelaEntrada from '../components/TelaEntrada'

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
    <TelaEntrada>
      <div>
        <Marca icone className="text-3xl lg:hidden" />
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight lg:mt-0">Bem-vindo de volta</h1>
        <p className="mt-1.5 text-texto-2">Suas mensagens, a Bíblia e o telão no mesmo lugar.</p>

        <form onSubmit={entrar} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Usuário</span>
            <input type="text" required placeholder="nome.sobrenome" value={usuario}
              onChange={(e) => setUsuario(e.target.value)} className="campo"
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Senha</span>
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
          <Link to="/criar-conta" className="font-semibold text-tinta underline-offset-4 hover:underline">Criar conta</Link>
        </p>
        <p className="mt-3 text-center text-sm text-texto-2">
          Esqueceu a senha? Peça para quem administra o Pulpito redefinir.
        </p>
      </div>
    </TelaEntrada>
  )
}