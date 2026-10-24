import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import Marca from '../components/Marca'
import TelaEntrada from '../components/TelaEntrada'

/*
  Destino do link de "esqueci a senha". O Supabase abre esta página já com uma sessão
  de recuperação; a pessoa escolhe a senha nova e segue para o app.
*/
export default function NovaSenha() {
  const { sessao, carregando } = useAuth()
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  // O link pode chegar com o erro na URL (expirado, já usado); sem sessão depois de carregar, também não valeu
  const [erroNaUrl] = useState(() => /error=/.test(window.location.hash + window.location.search))
  const linkInvalido = erroNaUrl || (!carregando && !sessao)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmacao) { setErro('As duas senhas não são iguais.'); return }
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setEnviando(false)
    if (error) {
      setErro(error.message.toLowerCase().includes('different')
        ? 'Essa é a senha que você já usa. Escolha outra.'
        : 'Não foi possível salvar a senha. Peça um novo link e tente de novo.')
      return
    }
    navigate('/', { replace: true })
  }

  if (linkInvalido) return (
    <TelaEntrada>
      <div>
        <Marca icone className="text-3xl lg:hidden" />
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight lg:mt-0">Link expirado</h1>
        <p className="mt-2 text-texto-2">Esse link já foi usado ou passou do prazo de uma hora. Peça outro e abra a mensagem mais recente.</p>
        <Link to="/recuperar-senha" className="botao-primario mt-8 w-full">Pedir novo link</Link>
      </div>
    </TelaEntrada>
  )

  return (
    <TelaEntrada>
      <div>
        <Marca icone className="text-3xl lg:hidden" />
        <h1 className="mt-8 font-display text-3xl font-extrabold tracking-tight lg:mt-0">Nova senha</h1>
        <p className="mt-1.5 text-texto-2">{sessao?.user.email ? <>Para <b className="text-texto">{sessao.user.email}</b>.</> : 'Escolha a senha que vai usar daqui em diante.'}</p>

        <form onSubmit={salvar} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Nova senha</span>
            <input type="password" required autoComplete="new-password" placeholder="Pelo menos 6 caracteres"
              value={senha} onChange={(e) => setSenha(e.target.value)} className="campo" autoFocus />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Repita a nova senha</span>
            <input type="password" required autoComplete="new-password"
              value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="campo" />
          </label>
          {erro && <p role="alert" className="text-sm text-perigo">{erro}</p>}
          <button disabled={enviando || carregando} className="botao-primario w-full">
            {enviando ? 'Salvando…' : 'Salvar e entrar'}
          </button>
        </form>
      </div>
    </TelaEntrada>
  )
}
