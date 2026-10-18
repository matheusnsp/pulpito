import { useEffect, useState, type FormEvent } from 'react'
import { Check, GraduationCap, KeyRound, LoaderCircle, LogOut, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { sairDaConta } from '../lib/conta'
import { TEMAS, lerTema, salvarTema, type Tema } from '../lib/tema'
import { VERSOES, type VersaoId } from '../lib/biblia'
import { emailParaUsuario, nomeDeExibicao } from '../lib/usuario'
import { VERSAO_APP, carregarUltimaVersao } from '../lib/atualizar'
import { abrirTutorial } from '../lib/tutorial'
import { aoMudarVersao, lerVersao, salvarVersao } from '../lib/preferencias'


function TrocarSenha({ email }: { email: string }) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function trocar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setPronto(false)
    if (nova.length < 6) { setErro('A nova senha precisa ter pelo menos 6 caracteres.'); return }
    if (nova !== confirmacao) { setErro('As duas senhas novas não são iguais.'); return }
    if (nova === atual) { setErro('A nova senha é igual à atual.'); return }

    setEnviando(true)
    // Confirma a senha atual antes de trocar
    const conferir = await supabase.auth.signInWithPassword({ email, password: atual })
    if (conferir.error) {
      setEnviando(false)
      setErro('A senha atual está incorreta.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: nova })
    setEnviando(false)
    if (error) { setErro('Não foi possível alterar a senha. Tente de novo.'); return }
    setAtual('')
    setNova('')
    setConfirmacao('')
    setPronto(true)
  }

  return (
    <form onSubmit={trocar} className="cartao space-y-4 p-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-texto-2">Senha atual</span>
        <input type="password" required autoComplete="current-password" value={atual}
          onChange={(e) => setAtual(e.target.value)} className="campo" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-texto-2">Nova senha</span>
          <input type="password" required autoComplete="new-password" placeholder="Pelo menos 6 caracteres"
            value={nova} onChange={(e) => setNova(e.target.value)} className="campo" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-texto-2">Repita a nova senha</span>
          <input type="password" required autoComplete="new-password"
            value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className="campo" />
        </label>
      </div>
      {erro && <p role="alert" className="text-sm text-perigo">{erro}</p>}
      {pronto && (
        <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-tinta">
          <Check size={16} /> Senha alterada
        </p>
      )}
      <button disabled={enviando} className="botao-secundario">
        <KeyRound size={18} /> {enviando ? 'Alterando…' : 'Alterar senha'}
      </button>
    </form>
  )
}

export default function Ajustes() {
  const { sessao } = useAuth()
  const email = sessao?.user.email ?? ''
  const usuario = emailParaUsuario(email)
  const nome = nomeDeExibicao(usuario)
  const iniciais = nome.split(' ').map((p) => p[0]).slice(0, 2).join('')
  const [tema, setTema] = useState<Tema>(lerTema)
  const [versao, setVersao] = useState<VersaoId>(lerVersao)
  useEffect(() => aoMudarVersao(() => setVersao(lerVersao())), [])
  const [saindo, setSaindo] = useState(false)

  function mudarTema(t: Tema) {
    setTema(t)
    salvarTema(t)
  }

  function mudarVersao(v: VersaoId) {
    setVersao(v)
    salvarVersao(v)
  }

  async function sair() {
    setSaindo(true)
    await sairDaConta()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 pb-10 pt-2 md:px-8 md:pt-10">
      <h1 className="titulo-pagina">Ajustes</h1>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Conta</h2>
        <div className="cartao flex items-center gap-4 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-texto font-display font-bold text-fundo">
            {iniciais}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{nome}</p>
            <p className="truncate text-sm text-texto-2">{usuario}</p>
          </div>
          <button onClick={sair} disabled={saindo} className="botao-fantasma">
            <LogOut size={18} />
            {saindo ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold">Aparência</h2>
          <p className="text-sm text-texto-2">O modo pregação e o telão são sempre escuros, nas cores do tema.</p>
        </div>
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-3">
          {TEMAS.map((t) => {
            const ativo = tema === t.valor
            return (
              <button key={t.valor} role="radio" aria-checked={ativo} onClick={() => mudarTema(t.valor)}
                className={`overflow-hidden rounded-2xl border-2 text-left transition ${ativo ? 'border-acao' : 'border-borda hover:border-texto-2'}`}>
                <span className="block p-3" style={{ background: t.fundo, color: t.texto }}>
                  <span className="block font-display text-sm font-extrabold">Boa noite</span>
                  <span className="mt-2 flex items-center gap-1.5">
                    <span className="h-6 flex-1 rounded-md" style={{ background: t.acao }} />
                    <span className="h-6 w-8 rounded-md opacity-15" style={{ background: t.texto }} />
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 bg-superficie px-3 py-2 text-sm font-bold">
                  {t.rotulo}
                  {ativo && <Check size={16} className="shrink-0 text-tinta" />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold">Senha</h2>
          <p className="text-sm text-texto-2">Para trocar, confirme primeiro a senha que você usa hoje.</p>
        </div>
        {email && <TrocarSenha email={email} />}
      </section>


      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold">Bíblia</h2>
          <p className="text-sm text-texto-2">Versão usada no editor, no modo pregação e no telão. Fica salva na sua conta, em qualquer aparelho.</p>
        </div>
        <select value={versao} onChange={(e) => mudarVersao(e.target.value as VersaoId)} className="campo">
          {VERSOES.map((v) => <option key={v.id} value={v.id}>{v.id}, {v.nome}</option>)}
        </select>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold">Tutorial</h2>
          <p className="text-sm text-texto-2">Reveja como funcionam as mensagens, os slides, o modo pregação e o telão.</p>
        </div>
        <button onClick={abrirTutorial} className="botao-secundario w-full sm:w-auto">
          <GraduationCap size={18} /> Ver tutorial
        </button>
      </section>

      <AtualizarApp />
    </div>
  )
}

/* Recarrega a versão mais nova do app, apagando as cópias antigas guardadas no aparelho */
function AtualizarApp() {
  const [atualizando, setAtualizando] = useState(false)
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold">Atualizar o app</h2>
        <p className="text-sm text-texto-2">
          Se algo parece desatualizado, isto apaga as cópias antigas guardadas neste aparelho e baixa a versão mais nova.
          Você continua logado e suas mensagens não são afetadas.
        </p>
      </div>
      <div className="cartao flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <span className="text-texto-2">Versão deste aparelho</span>
          <b className="block font-mono">{VERSAO_APP}</b>
        </div>
        <button onClick={() => { setAtualizando(true); carregarUltimaVersao() }} disabled={atualizando}
          className="botao-secundario w-full sm:w-auto">
          {atualizando ? <LoaderCircle size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          {atualizando ? 'Atualizando…' : 'Carregar última versão'}
        </button>
      </div>
    </section>
  )
}
