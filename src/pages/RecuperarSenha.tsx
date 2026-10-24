import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { emailValido } from '../lib/usuario'
import Marca from '../components/Marca'
import TelaEntrada from '../components/TelaEntrada'

/* Pede o link de redefinição por e-mail. Contas antigas, só com usuário, não têm para onde mandar. */
export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function pedir(e: FormEvent) {
    e.preventDefault()
    setErro('')
    const limpo = email.trim().toLowerCase()
    if (!limpo.includes('@')) {
      setErro('Sua conta foi criada só com usuário, sem e-mail, então não há para onde enviar o link. Entre com a senha atual e adicione um e-mail em Ajustes, ou peça para quem administra o Pulpito redefinir.')
      return
    }
    if (!emailValido(limpo)) { setErro('Digite um e-mail válido.'); return }
    setEnviando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(limpo, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })
    setEnviando(false)
    if (error && !error.message.toLowerCase().includes('rate')) {
      setErro('Não foi possível enviar. Verifique a internet e tente de novo.')
      return
    }
    // Mesmo que o e-mail não exista, a resposta é a mesma: não revela quem tem conta
    setEnviado(true)
  }

  if (enviado) return (
    <TelaEntrada>
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ouro-suave text-tinta"><MailCheck size={30} /></span>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">Veja seu e-mail</h1>
        <p className="mt-2 text-texto-2">Se existir uma conta para <b className="text-texto">{email.trim()}</b>, o link para criar uma nova senha já está a caminho. Ele vale por uma hora.</p>
        <p className="mt-6 text-sm text-texto-2">Não chegou? Veja a caixa de spam ou <button onClick={() => setEnviado(false)} className="font-semibold text-tinta underline-offset-4 hover:underline">tente de novo</button>.</p>
        <Link to="/login" className="botao-secundario mt-8 w-full">Voltar para entrar</Link>
      </div>
    </TelaEntrada>
  )

  return (
    <TelaEntrada>
      <div>
        <Marca icone className="text-3xl lg:hidden" />
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight lg:mt-0">Recuperar senha</h1>
        <p className="mt-1.5 text-texto-2">Digite o e-mail da sua conta. Enviamos um link para você criar uma senha nova.</p>

        <form onSubmit={pedir} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">E-mail</span>
            <input type="text" required placeholder="voce@exemplo.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className="campo"
              autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" />
          </label>
          {erro && <p role="alert" className="text-sm text-perigo">{erro}</p>}
          <button disabled={enviando} className="botao-primario w-full">
            {enviando ? 'Enviando…' : 'Enviar link'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-texto-2">
          Lembrou a senha?{' '}
          <Link to="/login" className="font-semibold text-tinta underline-offset-4 hover:underline">Entrar</Link>
        </p>
      </div>
    </TelaEntrada>
  )
}
