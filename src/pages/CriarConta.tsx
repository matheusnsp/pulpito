import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { normalizarUsuario, usuarioNovoValido, usuarioParaEmail } from '../lib/usuario'
import Marca from '../components/Marca'

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
          : 'Não foi possível criar a conta. Verifique a internet e tente de novo.')
      return
    }
    if (!data.session) setErro('Conta criada, mas a confirmação automática está desligada no Supabase.')
  }

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Marca className="text-4xl" />
        <h1 className="mt-10 text-2xl font-semibold">Criar conta</h1>
        <p className="mt-1 text-texto-2">Seu usuário é seu nome e sobrenome, separados por ponto.</p>

        <form onSubmit={criar} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Usuário</span>
            <input type="text" required placeholder="maria.souza" value={usuario}
              onChange={(e) => setUsuario(e.target.value)} className="campo"
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            {usuario && final !== usuario && (
              <span className="mt-1.5 block text-sm text-texto-2">
                Vai ficar assim: <b className="text-texto">{final}</b>
              </span>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Senha</span>
            <input type="password" required autoComplete="new-password" placeholder="Pelo menos 6 caracteres"
              value={senha} onChange={(e) => setSenha(e.target.value)} className="campo" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Repita a senha</span>
            <input type="password" required autoComplete="new-password"
              value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="campo" />
          </label>
          {erro && <p role="alert" className="text-sm text-perigo">{erro}</p>}
          <button disabled={enviando} className="botao-primario w-full">
            {enviando ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-texto-2">
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-acao underline-offset-4 hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}