import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { emailValido } from '../lib/usuario'
import Marca from '../components/Marca'
import TelaEntrada from '../components/TelaEntrada'
import BotaoGoogle, { entrarComGoogle, googleDisponivel } from '../components/BotaoGoogle'

export default function CriarConta() {
  const { sessao } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmarEmail, setConfirmarEmail] = useState(false)

  if (sessao) return <Navigate to="/" replace />

  async function criar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (nome.trim().length < 2) { setErro('Digite seu nome.'); return }
    if (!emailValido(email)) { setErro('Digite um e-mail válido. Ele serve para recuperar a senha.'); return }
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmacao) { setErro('As duas senhas não são iguais.'); return }

    setEnviando(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(), password: senha,
      options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin },
    })
    setEnviando(false)

    if (error) {
      const m = error.message.toLowerCase()
      setErro(m.includes('already')
        ? 'Já existe uma conta com esse e-mail. Entre ou recupere a senha.'
        : m.includes('password')
          ? 'Senha fraca demais. Use pelo menos 6 caracteres.'
          : 'Não foi possível criar a conta. Verifique a internet e tente de novo.')
      return
    }
    // Confirmação de e-mail ligada no Supabase: a sessão só vem depois do clique no link
    if (!data.session) setConfirmarEmail(true)
  }

  if (confirmarEmail) return (
    <TelaEntrada>
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ouro-suave text-tinta"><MailCheck size={30} /></span>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">Confirme seu e-mail</h1>
        <p className="mt-2 text-texto-2">Enviamos um link para <b className="text-texto">{email.trim()}</b>. Abra a mensagem e clique nele para entrar.</p>
        <p className="mt-6 text-sm text-texto-2">Não chegou? Veja a caixa de spam ou <Link to="/login" className="font-semibold text-tinta underline-offset-4 hover:underline">volte para entrar</Link>.</p>
      </div>
    </TelaEntrada>
  )

  return (
    <TelaEntrada>
      <div>
        <Marca icone className="text-3xl lg:hidden" />
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight lg:mt-0">Criar conta</h1>
        <p className="mt-1 text-texto-2">Leva menos de um minuto. Seu e-mail fica só para entrar e recuperar a senha.</p>

        {googleDisponivel && (
          <>
            <div className="mt-6"><BotaoGoogle texto="Continuar com Google" onClick={() => entrarComGoogle().catch(() => setErro('Não foi possível abrir o Google. Tente de novo.'))} /></div>
            <div className="my-5 flex items-center gap-3 text-xs font-semibold text-texto-2">
              <span className="h-px flex-1 bg-borda" /> ou com e-mail <span className="h-px flex-1 bg-borda" />
            </div>
          </>
        )}

        <form onSubmit={criar} className={`space-y-4 ${googleDisponivel ? '' : 'mt-6'}`}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Seu nome</span>
            <input type="text" required placeholder="Maria Souza" value={nome}
              onChange={(e) => setNome(e.target.value)} className="campo" autoComplete="name" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">E-mail</span>
            <input type="email" required placeholder="voce@exemplo.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className="campo"
              autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Senha</span>
            <input type="password" required autoComplete="new-password" placeholder="Pelo menos 6 caracteres"
              value={senha} onChange={(e) => setSenha(e.target.value)} className="campo" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Repita a senha</span>
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
          <Link to="/login" className="font-semibold text-tinta underline-offset-4 hover:underline">Entrar</Link>
        </p>
      </div>
    </TelaEntrada>
  )
}
