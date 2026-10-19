import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Check, ChevronDown, CircleCheck, Download, GraduationCap, KeyRound, LoaderCircle, LogOut, RefreshCw, Sparkles, WifiOff, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { sairDaConta } from '../lib/conta'
import { TEMAS, lerTema, salvarTema, type Tema } from '../lib/tema'
import { VERSOES, type VersaoId } from '../lib/biblia'
import { emailParaUsuario, nomeDeExibicao } from '../lib/usuario'
import { NOVIDADES, VERSAO_APP, buscarServiceWorkerNovo, carregarUltimaVersao, verificarVersao, versaoAmigavel } from '../lib/atualizar'
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
    <div className="mx-auto max-w-2xl space-y-10 px-4 pb-10 pt-2 md:px-8 md:pt-10 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-start lg:gap-x-12 lg:gap-y-10 lg:space-y-0">
      <h1 className="titulo-pagina lg:col-span-2">Ajustes</h1>

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

      <section className="space-y-3 lg:row-span-2">
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
        <button onClick={() => abrirTutorial()} className="botao-secundario w-full sm:w-auto">
          <GraduationCap size={18} /> Ver tutorial
        </button>
      </section>

      <AtualizarApp />
    </div>
  )
}

/* Mostra se este aparelho está na versão mais nova, as novidades e o botão de atualizar */
type Estado = 'verificando' | 'em-dia' | 'nova' | 'sem-rede'
function AtualizarApp() {
  const [estado, setEstado] = useState<Estado>('verificando')
  const [remota, setRemota] = useState<string | null>(null)
  const [atualizando, setAtualizando] = useState(false)

  const aplicar = useCallback((r: Awaited<ReturnType<typeof verificarVersao>>) => {
    if (!r) { setEstado('sem-rede'); return }
    setRemota(r.remota.versao)
    setEstado(r.nova ? 'nova' : 'em-dia')
    if (r.nova) buscarServiceWorkerNovo()
  }, [])
  const verificar = () => { setEstado('verificando'); verificarVersao().then(aplicar) }

  useEffect(() => { verificarVersao().then(aplicar) }, [aplicar])

  function atualizar() { setAtualizando(true); carregarUltimaVersao() }

  const visual = {
    'verificando': { cor: 'var(--texto-2)', fundo: 'var(--superficie-2)', titulo: 'Procurando novidades…', texto: 'Só um instante.' },
    'em-dia': { cor: 'var(--sucesso)', fundo: 'color-mix(in srgb, var(--sucesso) 15%, transparent)', titulo: 'Você está na versão mais nova', texto: 'Quando sair uma versão nova, um aviso aparece sozinho.' },
    'nova': { cor: 'var(--acao)', fundo: 'color-mix(in srgb, var(--acao) 18%, transparent)', titulo: 'Tem versão nova!', texto: 'Atualiza em segundos. Você continua logado e nada se perde.' },
    'sem-rede': { cor: 'var(--aviso)', fundo: 'color-mix(in srgb, var(--aviso) 15%, transparent)', titulo: 'Sem internet para verificar', texto: 'O app funciona normalmente. Tente de novo quando estiver online.' },
  }[estado]

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold">Atualizar o app</h2>
      <div className={`cartao overflow-hidden ${estado === 'nova' ? 'border-acao ring-4 ring-acao/15' : ''}`}>
        <div className="flex items-center gap-4 p-4">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: visual.fundo, color: visual.cor }}>
            {estado === 'verificando' || atualizando ? <LoaderCircle size={26} className="animate-spin" />
              : estado === 'em-dia' ? <CircleCheck size={28} />
              : estado === 'nova' ? <Sparkles size={26} />
              : <WifiOff size={24} />}
            {estado === 'nova' && !atualizando && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-superficie bg-perigo" />}
          </span>
          <div className="min-w-0 flex-1">
            <b className="block font-display text-lg leading-tight">{atualizando ? 'Atualizando…' : visual.titulo}</b>
            <p className="mt-0.5 text-sm leading-snug text-texto-2">{atualizando ? 'O app vai reabrir sozinho.' : visual.texto}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 border-y border-borda text-sm">
          <div className="p-3 px-4">
            <span className="block text-xs text-texto-2">Neste aparelho</span>
            <b className="font-mono">{versaoAmigavel(VERSAO_APP)}</b>
          </div>
          <div className="border-l border-borda p-3 px-4">
            <span className="block text-xs text-texto-2">Mais nova</span>
            <b className="font-mono">{remota ? versaoAmigavel(remota) : '—'}</b>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4 sm:flex-row">
          {estado === 'nova' ? (
            <button onClick={atualizar} disabled={atualizando} className="botao-primario w-full sm:flex-1">
              <Download size={18} /> Atualizar agora
            </button>
          ) : (
            <button onClick={verificar} disabled={estado === 'verificando'} className="botao-secundario w-full sm:flex-1">
              <RefreshCw size={18} className={estado === 'verificando' ? 'animate-spin' : ''} /> Verificar de novo
            </button>
          )}
        </div>

        <div className="border-t border-borda bg-superficie-2/40 p-4">
          <p className="rotulo flex items-center gap-1.5"><Sparkles size={13} className="text-tinta" /> Novidades</p>
          <ul className="mt-2 space-y-2">
            {NOVIDADES.map((n) => (
              <li key={n.titulo} className="flex gap-2.5 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-acao" />
                <span><b>{n.titulo}.</b> <span className="text-texto-2">{n.texto}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <details className="group rounded-2xl border border-borda px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
          <Wrench size={16} className="text-texto-2" /> Algo parece estranho ou antigo?
          <ChevronDown size={16} className="ml-auto text-texto-2 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-3 text-texto-2">
          <p>
            A <b className="text-texto">atualização completa</b> apaga as cópias do app guardadas neste aparelho e baixa tudo de novo.
            A Bíblia baixada, o login e as mensagens continuam.
          </p>
          <p>No iPhone e iPad, se nada mudar, feche o app (deslize ele para cima na troca de apps) e abra de novo.</p>
          <button onClick={atualizar} disabled={atualizando} className="botao-secundario w-full sm:w-auto">
            <RefreshCw size={16} /> Fazer atualização completa
          </button>
        </div>
      </details>
    </section>
  )
}
