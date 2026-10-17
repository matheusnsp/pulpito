import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { normalizarUsuario, usuarioNovoValido, usuarioParaEmail } from '../lib/usuario'

const campo = 'w-full rounded-lg bg-neutral-900 px-3 py-2.5 ring-1 ring-neutral-800 outline-none focus:ring-neutral-600'

export default function CriarConta() {
  const { sessao } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (sessao) return <Navigate to="/" replace />

  const final = normalizarUsuario(usuario)

  async function criar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (!usuarioNovoValido(final)) { setErro('Use o formato nome.sobrenome, por exemplo maria.souza.'); return }
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmacao) { setErro('As duas senhas não são iguais.'); return }

    setEnviando(true)
    const { data, error } = await supabase.auth.signUp({ email: usuarioParaEmail(final), password: senha })
    setEnviando(false)

    if (error) {
      const m = error.message.toLowerCase()
      setErro(m.includes('already')
        ? 'Esse usuário já existe. Escolha outro ou entre na sua conta.'
        : m.includes('password')
          ? 'Senha fraca demais. Use pelo menos 6 caracteres.'
          : 'Não foi possível criar a conta. Tente de novo.')
      return
    }
    if (!data.session) setErro('Conta criada, mas a confirmação automática está desligada no Supabase.')
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form onSubmit={criar} className="w-full max-w-sm space-y-3">
        <h1 className="mb-4 text-2xl font-semibold">Criar conta</h1>

        <input type="text" required placeholder="nome.sobrenome" value={usuario}
          onChange={(e) => setUsuario(e.target.value)} className={campo}
          autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        {usuario && final !== usuario && (
          <p className="text-sm text-neutral-400">Seu usuário será <b className="text-neutral-200">{final}</b></p>
        )}

        <input type="password" required autoComplete="new-password" placeholder="Senha (mínimo 6 caracteres)"
          value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} />
        <input type="password" required autoComplete="new-password" placeholder="Repita a senha"
          value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className={campo} />

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <button disabled={enviando}
          className="w-full rounded-lg bg-neutral-100 py-2.5 font-medium text-neutral-900 disabled:opacity-50">
          {enviando ? 'Criando…' : 'Criar conta'}
        </button>
        <p className="text-center text-sm text-neutral-500">
          Já tem conta? <Link to="/login" className="text-neutral-200 underline">Entrar</Link>
        </p>
      </form>
    </div>
  )
}