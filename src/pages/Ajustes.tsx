import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Check, ChevronDown, CircleCheck, Download, GraduationCap, KeyRound, LoaderCircle, LogOut, RefreshCw, Sparkles, WifiOff, Wrench, Globe, Users, Trash2, BookOpen, MessagesSquare, Palette } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { sairDaConta } from '../lib/conta'
import { TEMAS, lerTema, salvarTema, type Tema } from '../lib/tema'
import { VERSOES, type VersaoId } from '../lib/biblia'
import { emailParaUsuario, nomeDeExibicao } from '../lib/usuario'
import { NOVIDADES, NUMERO_VERSAO, VERSAO_APP, buscarServiceWorkerNovo, carregarUltimaVersao, verificarVersao, versaoAmigavel } from '../lib/atualizar'
import { abrirTutorial } from '../lib/tutorial'
import { ANO_INICIO, AUTOR } from '../lib/autor'
import { TAMANHOS_TEXTO, lerTamanhoTexto, salvarTamanhoTexto, type TamanhoTexto } from '../lib/tamanhoTexto'
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

  const [senhaAberta, setSenhaAberta] = useState(false)
  const [tamTexto, setTamTexto] = useState<TamanhoTexto>(lerTamanhoTexto)
  const atalhos = [
    { nome: 'Ver tutorial', texto: 'Tudo o que o app faz', Icone: GraduationCap, acao: () => abrirTutorial() },
    { nome: 'Entrar com convite', texto: 'Projeto de outra pessoa', Icone: Users, para: '/entrar-projeto' },
    { nome: 'Lixeira', texto: 'Excluídos nos últimos 30 dias', Icone: Trash2, para: '/lixeira' },
    { nome: 'Banco de perguntas', texto: 'Perguntas de todos os estudos', Icone: MessagesSquare, para: '/perguntas' },
  ]

  return (
    <div className="mx-auto max-w-2xl px-3 sm:px-4 pb-12 pt-2 md:max-w-3xl md:px-8 md:pt-10 lg:max-w-4xl xl:max-w-7xl">
      <div className="flex items-end justify-between gap-3">
        <h1 className="titulo-pagina">Ajustes</h1>
        <span className="mb-1 rounded-full bg-superficie-2 px-3 py-1 text-xs font-bold text-texto-2">Pulpito {NUMERO_VERSAO}</span>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-12 xl:items-start">
        {/* No computador: duas colunas independentes (sem buracos). No celular: uma coluna, na ordem do "order". */}
        <div className="contents xl:col-span-7 xl:block xl:space-y-5">
        {/* Conta: perfil, trocar senha e sair */}
        <section className="cartao order-1 overflow-hidden">
          <div className="relative flex flex-wrap items-center gap-4 p-4 sm:p-5">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-acao/15 blur-3xl" />
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-acao font-display text-2xl font-extrabold text-acao-texto">
              {iniciais}
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="truncate font-display text-xl font-extrabold">{nome}</p>
              <p className="truncate text-sm text-texto-2">{usuario}</p>
            </div>
            <div className="relative flex w-full gap-2 sm:w-auto">
              <button onClick={() => setSenhaAberta((v) => !v)} aria-expanded={senhaAberta}
                className={`${senhaAberta ? 'botao-primario' : 'botao-secundario'} flex-1 py-2 text-sm sm:flex-none`}>
                <KeyRound size={16} /> Trocar senha
              </button>
              <button onClick={sair} disabled={saindo} className="botao-secundario flex-1 py-2 text-sm hover:text-perigo sm:flex-none">
                <LogOut size={16} /> {saindo ? 'Saindo…' : 'Sair'}
              </button>
            </div>
          </div>
          {senhaAberta && email && (
            <div className="border-t border-borda bg-superficie-2/40 p-4 sm:p-5">
              <p className="mb-3 text-sm text-texto-2">Para trocar, confirme primeiro a senha que você usa hoje.</p>
              <TrocarSenha email={email} />
            </div>
          )}
        </section>

        {/* Preferências: tema e Bíblia */}
        <section className="cartao order-3 p-4 sm:p-5">
          <Titulo Icone={Palette} titulo="Aparência" texto="O modo pregação e o telão são sempre escuros, nas cores do tema." />
          <div role="radiogroup" aria-label="Tema" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {TEMAS.map((t) => {
              const ativo = tema === t.valor
              return (
                <button key={t.valor} role="radio" aria-checked={ativo} onClick={() => mudarTema(t.valor)}
                  className={`overflow-hidden rounded-2xl border-2 text-left transition ${ativo ? 'border-acao' : 'border-borda hover:border-texto-2'}`}>
                  <span className="block p-3" style={{ background: t.fundo, color: t.texto }}>
                    <span className="block font-display text-sm font-extrabold">Boa noite</span>
                    <span className="mt-2 flex items-center gap-1.5">
                      <span className="h-5 flex-1 rounded-md" style={{ background: t.acao }} />
                      <span className="h-5 w-6 rounded-md opacity-15" style={{ background: t.texto }} />
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2 bg-superficie px-3 py-2 text-xs font-bold">
                    <span className="truncate">{t.rotulo}</span>
                    {ativo && <Check size={15} className="shrink-0 text-tinta" />}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-6">
            <span className="mb-2 block text-sm font-semibold text-texto-2">Tamanho do texto do app</span>
            <div role="radiogroup" aria-label="Tamanho do texto do app" className="grid grid-cols-4 gap-2">
              {TAMANHOS_TEXTO.map((t) => {
                const ativo = tamTexto === t.id
                return (
                  <button key={t.id} role="radio" aria-checked={ativo} onClick={() => { setTamTexto(t.id); salvarTamanhoTexto(t.id) }}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2 transition ${ativo ? 'border-acao bg-ouro-suave' : 'border-borda hover:border-texto-2'}`}>
                    <span aria-hidden className="flex h-7 items-end font-display font-extrabold leading-none" style={{ fontSize: `${t.pct * 0.2}px` }}>Aa</span>
                    <span className="text-center text-[11px] font-bold leading-tight">{t.rotulo}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-texto-2">No celular e no tablet a tela não tem zoom; use isto para aumentar a letra. No modo pregação e na Bíblia, a pinça continua mudando o tamanho do texto.</p>
          </div>

          <div className="mt-6 border-t border-borda pt-5">
            <Titulo Icone={BookOpen} titulo="Bíblia" texto="Versão usada no editor, no modo pregação e no telão. Fica salva na sua conta." />
            <div role="radiogroup" aria-label="Versão da Bíblia" className="mt-4 grid grid-cols-3 gap-2">
              {VERSOES.map((v) => {
                const ativo = versao === v.id
                return (
                  <button key={v.id} role="radio" aria-checked={ativo} onClick={() => mudarVersao(v.id)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${ativo ? 'border-acao bg-ouro-suave' : 'border-borda hover:border-texto-2'}`}>
                    <b className="flex items-center justify-between font-display">{v.id}{ativo && <Check size={15} className="text-tinta" />}</b>
                    <span className="mt-0.5 line-clamp-2 block text-[11px] leading-tight text-texto-2 sm:text-xs">{v.nome}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>


        <div className="order-5"><Sobre /></div>
        </div>

        <div className="contents xl:col-span-5 xl:block xl:space-y-5">
        {/* Atalhos */}
        <section className="order-2 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-2">
          {atalhos.map(({ nome: n, texto, Icone, acao, para }) => {
            const conteudo = (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ouro-suave text-tinta transition group-hover:bg-acao group-hover:text-acao-texto"><Icone size={20} /></span>
                <span className="mt-3 block font-display font-bold leading-tight">{n}</span>
                <span className="mt-0.5 block text-xs leading-snug text-texto-2">{texto}</span>
              </>
            )
            const classe = 'group cartao flex flex-col p-4 text-left transition hover:border-acao'
            return para
              ? <Link key={n} to={para} className={classe}>{conteudo}</Link>
              : <button key={n} onClick={acao} className={classe}>{conteudo}</button>
          })}
        </section>

        <div className="order-4"><AtualizarApp /></div>
        </div>
      </div>
    </div>
  )
}

/* Cabeçalho dos cartões */
function Titulo({ Icone, titulo, texto }: { Icone: typeof Palette; titulo: string; texto?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-superficie-2 text-texto-2"><Icone size={18} /></span>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold leading-tight">{titulo}</h2>
        {texto && <p className="mt-0.5 text-sm text-texto-2">{texto}</p>}
      </div>
    </div>
  )
}

/* Marcas do GitHub e do LinkedIn (o lucide não traz logos de empresas) */
const Github = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
)
const Linkedin = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
  </svg>
)

/* Sobre o app e o autor */
function Sobre() {
  const links = [
    { nome: 'Site', url: AUTOR.site, Icone: Globe },
    { nome: 'GitHub', url: AUTOR.github, Icone: Github },
    { nome: 'LinkedIn', url: AUTOR.linkedin, Icone: Linkedin },
  ]
  return (
    <section>
      <div className="cartao flex flex-col gap-4 p-4 sm:p-5 sm:flex-row sm:items-center">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-acao font-display text-xl font-extrabold text-acao-texto">MN</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-texto-2">O Pulpito foi idealizado e criado por</p>
          <b className="block font-display text-xl">{AUTOR.nome}</b>
          <p className="text-xs text-texto-2">Pulpito {NUMERO_VERSAO} · © {ANO_INICIO}{new Date().getFullYear() > ANO_INICIO ? `–${new Date().getFullYear()}` : ''} {AUTOR.nome}. Todos os direitos reservados.</p>
        </div>
        <div className="flex gap-2">
          {links.map(({ nome, url, Icone }) => (
            <a key={nome} href={url} target="_blank" rel="noopener" aria-label={nome} title={nome}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-borda text-texto-2 hover:border-acao hover:text-texto">
              <Icone size={18} />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* Mostra se este aparelho está na versão mais nova, as novidades e o botão de atualizar */
type Estado = 'verificando' | 'em-dia' | 'nova' | 'sem-rede'
function AtualizarApp() {
  const [estado, setEstado] = useState<Estado>('verificando')
  const [remota, setRemota] = useState<{ versao: string; numero?: string } | null>(null)
  const [atualizando, setAtualizando] = useState(false)

  const aplicar = useCallback((r: Awaited<ReturnType<typeof verificarVersao>>) => {
    if (!r) { setEstado('sem-rede'); return }
    setRemota(r.remota)
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
    <section className={`cartao overflow-hidden ${estado === 'nova' ? 'border-acao ring-4 ring-acao/15' : ''}`}>
        <div className="flex items-center gap-4 p-4 sm:p-5">
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
          <div className="p-3 px-5">
            <span className="block text-xs text-texto-2">Neste aparelho</span>
            <b className="block font-display text-lg leading-tight">Versão {NUMERO_VERSAO}</b>
            <span className="font-mono text-xs text-texto-2">{versaoAmigavel(VERSAO_APP)}</span>
          </div>
          <div className="border-l border-borda p-3 px-5">
            <span className="block text-xs text-texto-2">Mais nova</span>
            <b className="block font-display text-lg leading-tight">{remota?.numero ? `Versão ${remota.numero}` : '—'}</b>
            <span className="font-mono text-xs text-texto-2">{remota ? versaoAmigavel(remota.versao) : ''}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row">
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

        <div className="border-t border-borda bg-superficie-2/40 px-5 py-4">
          <p className="rotulo flex items-center gap-1.5"><Sparkles size={13} className="text-tinta" /> Novidades</p>
          <ul className="mt-2 space-y-2">
            {NOVIDADES.slice(0, 4).map((n) => (
              <li key={n.titulo} className="flex gap-2.5 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-acao" />
                <span><b>{n.titulo}.</b> <span className="text-texto-2">{n.texto}</span></span>
              </li>
            ))}
          </ul>
        </div>

      <details className="group border-t border-borda px-5 py-3 text-sm">
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
