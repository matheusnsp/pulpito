import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { normalizarUsuario, usuarioValido, usuarioParaEmail } from '../lib/usuario'

const campo = 'w-full rounded-lg bg-neutral-900 px-3 py-2.5 ring-1 ring-neutral-800 outline-none focus:ring-neutral-600'

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
    if (!usuarioValido(nome)) {
      setErro('Usuário inválido. Use letras, números, ponto, hífen ou _.')
      return
    }
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: usuarioParaEmail(nome),
      password: senha,
    })
    setEnviando(false)
    if (error) {
      setErro(error.message === 'Invalid login credentials'
        ? 'Usuário ou senha incorretos.'
        : 'Não foi possível entrar. Tente de novo.')
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-3">
        <h1 className="mb-4 text-2xl font-semibold">Entrar</h1>
        <input type="text" required placeholder="Usuário" value={usuario}
          onChange={(e) => setUsuario(e.target.value)} className={campo}
          autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        <input type="password" required autoComplete="current-password" placeholder="Senha"
          value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} />
        {erro && <p className="text-sm text-red-400">{erro}</p>}
        <button disabled={enviando}
          className="w-full rounded-lg bg-neutral-100 py-2.5 font-medium text-neutral-900 disabled:opacity-50">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}