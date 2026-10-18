import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import {
  BookOpen, Check, ChevronRight, Copy, Ellipsis, NotebookPen, FolderInput, GripVertical, Pencil, Play, Plus, Search, Trash2, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { emailParaUsuario, nomeDeExibicao } from '../lib/usuario'
import { LIVROS, parseReferencia } from '../lib/biblia'
import type { Mensagem, Pasta } from '../lib/tipos'
import { criarMensagem, duplicarMensagem } from '../lib/mensagens'

const CHAVE_FILTRO = 'pulpito-filtro-pasta'
const TEMPO_DESFAZER = 6000
type Filtro = 'todas' | 'sem' | string

type Proximo = {
  id: string
  titulo: string
  inicio: string
  local: string | null
  mensagem: {
    id: string; titulo: string; texto_base: string | null; tempo_minutos: number
    topicos: { count: number }[]
  } | null
}

const normalizar = (s: string | null) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const ordenar = (lista: Pasta[]) => [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

const ordenarMensagens = (lista: Mensagem[]) =>
  [...lista].sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

function saudacao(hora: number) {
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
}

/* "Mateus 13:3-9" → "Mt 13:3-9" */
function refCurta(texto: string | null) {
  const r = texto ? parseReferencia(texto) : null
  if (!r) return texto?.trim() || ''
  const abrev = LIVROS.find((l) => l.usfm === r.livro)?.abrev ?? r.livro
  let s = `${abrev} ${r.capitulo}`
  if (r.inicio) s += `:${r.inicio}`
  if (r.inicio && r.fim && r.fim !== r.inicio) s += `-${r.fim}`
  return s
}

function quandoEditada(iso: string, hoje: Date) {
  const d = new Date(iso)
  const dias = Math.round((inicioDoDia(hoje) - inicioDoDia(d)) / 86_400_000)
  if (dias <= 0) return 'editada hoje'
  if (dias === 1) return 'editada ontem'
  return `editada em ${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}`
}

function quandoEvento(iso: string, hoje: Date) {
  const d = new Date(iso)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':00', 'h')
  const dias = Math.round((inicioDoDia(d) - inicioDoDia(hoje)) / 86_400_000)
  if (dias <= 0) return `hoje às ${hora}`
  if (dias === 1) return `amanhã às ${hora}`
  if (dias < 7) return `${d.toLocaleDateString('pt-BR', { weekday: 'long' })} às ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} às ${hora}`
}

/* ── Aba de pasta: recebe mensagens arrastadas ── */
function ChipPasta({ valor, rotulo, qtd, ativo, soltavel, onClick }: {
  valor: Filtro; rotulo: string; qtd: number; ativo: boolean; soltavel: boolean; onClick: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `pasta:${valor}`, disabled: !soltavel })
  const estilo = isOver
    ? 'scale-105 border-acao bg-acao/20 text-texto'
    : ativo
      ? 'border-texto bg-texto text-fundo'
      : 'border-borda bg-superficie text-texto-2 hover:border-texto-2 hover:text-texto'
  return (
    <button ref={setNodeRef} onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${estilo}`}>
      {rotulo}
      <span className={`rounded-full px-1.5 text-xs font-bold tabular-nums ${ativo && !isOver ? 'bg-fundo/20' : 'bg-superficie-2'}`}>{qtd}</span>
    </button>
  )
}

/* ── Linha da lista: arrasta pela alça, ações no menu ⋯ ── */
function LinhaMensagem({ m, pasta, pastas, hoje, menuAberto, onAbrirMenu, onFecharMenu, onMover, onDuplicar, onExcluir }: {
  m: Mensagem
  pasta: Pasta | null
  pastas: Pasta[]
  hoje: Date
  menuAberto: boolean
  onAbrirMenu: () => void
  onFecharMenu: () => void
  onMover: (destino: string) => void
  onDuplicar: () => void
  onExcluir: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: m.id })
  const ref = refCurta(m.texto_base)
  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-superficie-2'

  return (
    <li ref={setNodeRef}
      className={`cartao group relative flex animate-entrar items-center gap-1 py-1 pl-1 pr-2 transition hover:border-texto-2/40 ${isDragging ? 'opacity-30' : ''} ${menuAberto ? 'z-30' : ''}`}>
      <button {...listeners} {...attributes} aria-label="Arrastar para uma pasta"
        className="cursor-grab touch-none self-stretch px-1.5 text-texto-2/40 hover:text-texto-2 active:cursor-grabbing">
        <GripVertical size={18} />
      </button>

      <Link to={`/mensagem/${m.id}`} className="min-w-0 flex-1 py-3">
        <p className="truncate font-display text-[17px] font-bold leading-snug">{m.titulo || 'Sem título'}</p>
        <p className="mt-1.5 flex min-w-0 items-center gap-2 text-sm text-texto-2">
          {ref && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ouro-suave px-1.5 py-0.5 text-xs font-bold text-tinta">
              <BookOpen size={12} strokeWidth={2.5} /> {ref}
            </span>
          )}
          <span className="truncate">
            {pasta && `${pasta.nome} · `}
            {quandoEditada(m.atualizado_em, hoje)}
          </span>
        </p>
      </Link>

      <Link to={`/pregar/${m.id}`} aria-label="Pregar"
        className="hidden h-9 w-9 items-center justify-center rounded-xl bg-acao text-acao-texto opacity-0 transition group-hover:opacity-100 md:flex">
        <Play size={16} fill="currentColor" />
      </Link>
      <button onClick={onAbrirMenu} aria-label="Mais opções" aria-expanded={menuAberto}
        className="rounded-xl p-2 text-texto-2 hover:bg-superficie-2 hover:text-texto">
        <Ellipsis size={20} />
      </button>

      {menuAberto && (
        <>
          <div className="fixed inset-0 z-30" onClick={onFecharMenu} />
          <div className="absolute right-2 top-14 z-40 w-60 animate-entrar rounded-2xl border border-borda bg-superficie p-1.5 shadow-xl">
            <Link to={`/pregar/${m.id}`} className={item}>
              <Play size={18} className="text-tinta" /> Pregar
            </Link>
            <button onClick={onDuplicar} className={item}>
              <Copy size={18} className="text-texto-2" /> Duplicar
            </button>
            <label className={`${item} cursor-pointer`}>
              <FolderInput size={18} className="text-texto-2" />
              Mover para
              <select value={m.pasta_id ?? 'sem'} onChange={(e) => onMover(e.target.value)}
                className="ml-auto max-w-24 truncate bg-transparent text-sm text-texto-2 outline-none">
                <option value="sem">Sem pasta</option>
                {pastas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
            <button onClick={onExcluir} className={`${item} text-perigo`}>
              <Trash2 size={18} /> Excluir
            </button>
          </div>
        </>
      )}
    </li>
  )
}

export default function Mensagens() {
  const navigate = useNavigate()
  const { sessao } = useAuth()
  const [hoje] = useState(() => new Date())
  const [mensagens, setMensagens] = useState<Mensagem[] | null>(null)
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [proximo, setProximo] = useState<Proximo | null>(null)
  const [filtro, setFiltro] = useState<Filtro>(() => localStorage.getItem(CHAVE_FILTRO) || 'todas')
  const [novaPasta, setNovaPasta] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const campoBusca = useRef<HTMLInputElement>(null)

  // Exclusão com "Desfazer": só apaga do banco depois do tempo
  const pendente = useRef<{ m: Mensagem; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [excluida, setExcluida] = useState<Mensagem | null>(null)

  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const primeiroNome = nomeDeExibicao(emailParaUsuario(sessao?.user.email)).split(' ')[0]

  useEffect(() => { localStorage.setItem(CHAVE_FILTRO, filtro) }, [filtro])

  // Atalho: "/" vai para a busca
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement
      if (e.key !== '/' || alvo.closest('input, textarea, select, [contenteditable]')) return
      e.preventDefault()
      campoBusca.current?.focus()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').order('atualizado_em', { ascending: false }),
      supabase.from('pastas').select('id, nome'),
      supabase.from('eventos')
        .select('id, titulo, inicio, local, mensagem:mensagens(id, titulo, texto_base, tempo_minutos, topicos(count))')
        .gte('inicio', new Date().toISOString()).order('inicio').limit(1).maybeSingle(),
    ]).then(([m, p, e]) => {
      if (!ativo) return
      if (m.error) setErro('Não foi possível carregar suas mensagens. Verifique a internet.')
      setMensagens((m.data as Mensagem[]) ?? [])
      setPastas(ordenar((p.data as Pasta[]) ?? []))
      setProximo((e.data as unknown as Proximo) ?? null)
    })
    return () => { ativo = false }
  }, [])

  // Ao sair da tela com uma exclusão pendente, confirma a exclusão
  useEffect(() => () => {
    const p = pendente.current
    if (!p) return
    clearTimeout(p.timer)
    pendente.current = null
    void supabase.from('mensagens').delete().eq('id', p.m.id).then(() => {})
  }, [])

  const filtroValido = filtro === 'todas' || filtro === 'sem' || pastas.some((p) => p.id === filtro)
  const filtroAtivo = mensagens === null || filtroValido ? filtro : 'todas'
  const pastaAtual = pastas.find((p) => p.id === filtroAtivo) ?? null

  async function criar() {
    setCriando(true)
    try { navigate(`/mensagem/${await criarMensagem(pastaAtual?.id ?? null)}`) }
    catch { setErro('Não foi possível criar a mensagem.') }
    finally { setCriando(false) }
  }

  async function duplicar(m: Mensagem) {
    setMenu(null)
    setErro('')
    try {
      const nova = await duplicarMensagem(m)
      setMensagens((lista) => ordenarMensagens([...(lista ?? []), nova]))
    } catch {
      setErro('Não foi possível duplicar a mensagem.')
    }
  }

  async function apagarDeVez(m: Mensagem) {
    const { error } = await supabase.from('mensagens').delete().eq('id', m.id)
    if (error) {
      setErro('Não foi possível excluir. A mensagem voltou para a lista.')
      setMensagens((lista) => (lista ? ordenarMensagens([...lista, m]) : lista))
    }
  }

  function excluir(m: Mensagem) {
    setMenu(null)
    // Se outra exclusão ainda estava esperando, confirma ela agora
    if (pendente.current) {
      clearTimeout(pendente.current.timer)
      apagarDeVez(pendente.current.m)
    }
    setMensagens((lista) => lista?.filter((x) => x.id !== m.id) ?? null)
    const timer = setTimeout(() => {
      pendente.current = null
      setExcluida(null)
      apagarDeVez(m)
    }, TEMPO_DESFAZER)
    pendente.current = { m, timer }
    setExcluida(m)
  }

  function desfazerExclusao() {
    const p = pendente.current
    if (!p) return
    clearTimeout(p.timer)
    pendente.current = null
    setExcluida(null)
    setMensagens((lista) => (lista ? ordenarMensagens([...lista, p.m]) : lista))
  }

  async function moverPara(m: Mensagem, destino: string) {
    setMenu(null)
    const pasta_id = destino === 'sem' ? null : destino
    if (pasta_id === m.pasta_id) return
    setMensagens((lista) => lista?.map((x) => (x.id === m.id ? { ...x, pasta_id } : x)) ?? null)
    const { error } = await supabase.from('mensagens').update({ pasta_id }).eq('id', m.id)
    if (error) {
      setErro('Não foi possível mover a mensagem.')
      setMensagens((lista) => lista?.map((x) => (x.id === m.id ? { ...x, pasta_id: m.pasta_id } : x)) ?? null)
    }
  }

  function aoComecar(e: DragStartEvent) {
    setMenu(null)
    setArrastando(String(e.active.id))
  }

  function aoSoltar(e: DragEndEvent) {
    setArrastando(null)
    const alvo = e.over?.id
    if (typeof alvo !== 'string' || !alvo.startsWith('pasta:')) return
    const m = (mensagens ?? []).find((x) => x.id === e.active.id)
    if (m) moverPara(m, alvo.slice('pasta:'.length))
  }

  async function criarPasta(e: FormEvent) {
    e.preventDefault()
    const nome = (novaPasta ?? '').trim()
    if (!nome) { setNovaPasta(null); return }
    const { data, error } = await supabase.from('pastas').insert({ nome }).select('id, nome').single()
    if (error || !data) { setErro('Não foi possível criar a pasta.'); return }
    setPastas((lista) => ordenar([...lista, data as Pasta]))
    setFiltro(data.id)
    setNovaPasta(null)
  }

  async function renomearPasta(p: Pasta) {
    const nome = prompt('Novo nome da pasta:', p.nome)?.trim()
    if (!nome || nome === p.nome) return
    const { error } = await supabase.from('pastas').update({ nome }).eq('id', p.id)
    if (error) { setErro('Não foi possível renomear a pasta.'); return }
    setPastas((lista) => ordenar(lista.map((x) => (x.id === p.id ? { ...x, nome } : x))))
  }

  async function excluirPasta(p: Pasta) {
    const qtd = (mensagens ?? []).filter((m) => m.pasta_id === p.id).length
    const aviso = qtd === 0 ? '' : qtd === 1
      ? ' A mensagem dela vai para "Sem pasta".'
      : ` As ${qtd} mensagens dela vão para "Sem pasta".`
    if (!confirm(`Excluir a pasta "${p.nome}"?${aviso}`)) return
    const { error } = await supabase.from('pastas').delete().eq('id', p.id)
    if (error) { setErro('Não foi possível excluir a pasta.'); return }
    setPastas((lista) => lista.filter((x) => x.id !== p.id))
    setMensagens((lista) => lista?.map((m) => (m.pasta_id === p.id ? { ...m, pasta_id: null } : m)) ?? null)
    setFiltro('todas')
  }

  const todas = mensagens ?? []
  const termo = normalizar(busca.trim())
  const filtradas = todas.filter((m) => {
    const naPasta = filtroAtivo === 'todas' ? true
      : filtroAtivo === 'sem' ? !m.pasta_id : m.pasta_id === filtroAtivo
    const naBusca = !termo || normalizar(m.titulo).includes(termo) || normalizar(m.texto_base).includes(termo)
    return naPasta && naBusca
  })
  const mensagemArrastada = todas.find((m) => m.id === arrastando)
  const msgProxima = proximo?.mensagem ?? null
  const qtdTopicos = msgProxima?.topicos?.[0]?.count ?? 0

  const qtdPastas = pastas.length
  const ultima = !termo && todas[0] && todas[0].id !== msgProxima?.id ? todas[0] : null

  return (
    <DndContext sensors={sensores} onDragStart={aoComecar} onDragEnd={aoSoltar}
      onDragCancel={() => setArrastando(null)}>
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-2 md:px-8 md:pt-10">

        {/* Saudação */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="rotulo">
              {maiuscula(hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}
            </p>
            <h1 className="titulo-pagina mt-1.5">
              {saudacao(hoje.getHours())}, {primeiroNome}
            </h1>
          </div>
          {mensagens && mensagens.length > 0 && (
            <p className="hidden text-sm text-texto-2 sm:block">
              <b className="font-display text-texto">{mensagens.length}</b> {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
              {qtdPastas > 0 && <> · <b className="font-display text-texto">{qtdPastas}</b> {qtdPastas === 1 ? 'pasta' : 'pastas'}</>}
            </p>
          )}
        </header>

        {/* Próxima pregação */}
        {proximo && (
          <section className="relative mt-6 overflow-hidden rounded-3xl bg-[#14120D] p-5 text-[#F4F1E8] shadow-cartao md:p-7">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#FFC233]/25 blur-3xl" />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#FFCB57]">
                <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FFC233]" />
                Próxima pregação · {quandoEvento(proximo.inicio, hoje)}
              </p>
              {msgProxima ? (
                <div className="md:flex md:items-end md:justify-between md:gap-8">
                  <div className="min-w-0">
                    <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">{msgProxima.titulo}</h2>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/65">
                      {refCurta(msgProxima.texto_base) && <span className="font-bold text-[#FFCB57]">{refCurta(msgProxima.texto_base)}</span>}
                      <span>{qtdTopicos} {qtdTopicos === 1 ? 'tópico' : 'tópicos'}</span>
                      <span>{msgProxima.tempo_minutos} min</span>
                      <span>{proximo.titulo}{proximo.local ? ` · ${proximo.local}` : ''}</span>
                    </p>
                  </div>
                  <div className="mt-5 flex shrink-0 gap-2 md:mt-0">
                    <Link to={`/pregar/${msgProxima.id}`}
                      className="botao flex-1 bg-[#FFC233] px-6 text-[#1A1200] hover:brightness-105 md:flex-none">
                      <Play size={18} fill="currentColor" /> Pregar
                    </Link>
                    <Link to={`/mensagem/${msgProxima.id}`} className="botao bg-white/10 hover:bg-white/20">
                      Editar
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight">{proximo.titulo}</h2>
                  <p className="mt-1 text-sm text-white/65">Nenhuma mensagem ligada a este compromisso.</p>
                  <Link to="/agenda" className="botao mt-4 bg-white/10 hover:bg-white/20">Escolher mensagem</Link>
                </>
              )}
            </div>
          </section>
        )}

        {/* Continue de onde parou */}
        {ultima && (
          <Link to={`/mensagem/${ultima.id}`}
            className="cartao group mt-4 flex items-center gap-4 p-4 transition hover:border-texto-2/40">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ouro-suave text-tinta">
              <NotebookPen size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="rotulo block">Continue de onde parou</span>
              <span className="mt-0.5 block truncate font-display text-lg font-bold">{ultima.titulo || 'Sem título'}</span>
              <span className="block truncate text-sm text-texto-2">{quandoEditada(ultima.atualizado_em, hoje)}</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-texto-2 transition group-hover:translate-x-0.5" />
          </Link>
        )}

        {/* Busca */}
        <div className="relative mt-6">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-texto-2" />
          <input ref={campoBusca} value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou texto base" type="search" enterKeyHint="search"
            className="campo rounded-2xl py-3 pl-11 pr-12" />
          {busca ? (
            <button onClick={() => setBusca('')} aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-texto-2 hover:bg-superficie-2">
              <X size={18} />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-borda px-1.5 text-xs text-texto-2 md:block">/</kbd>
          )}
        </div>

        {/* Pastas (fixas no topo ao rolar, para receber o arraste) */}
        <div className="sticky top-0 z-10 -mx-4 bg-fundo/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
          <div className="sem-barra flex gap-2 overflow-x-auto">
            <ChipPasta valor="todas" rotulo="Todas" qtd={todas.length} ativo={filtroAtivo === 'todas'}
              soltavel={false} onClick={() => setFiltro('todas')} />
            <ChipPasta valor="sem" rotulo="Sem pasta" qtd={todas.filter((m) => !m.pasta_id).length}
              ativo={filtroAtivo === 'sem'} soltavel onClick={() => setFiltro('sem')} />
            {pastas.map((p) => (
              <ChipPasta key={p.id} valor={p.id} rotulo={p.nome}
                qtd={todas.filter((m) => m.pasta_id === p.id).length}
                ativo={filtroAtivo === p.id} soltavel onClick={() => setFiltro(p.id)} />
            ))}
            {novaPasta === null ? (
              <button onClick={() => setNovaPasta('')}
                className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-borda px-3.5 py-1.5 text-sm font-bold text-texto-2 hover:border-texto-2 hover:text-texto">
                <Plus size={16} /> Pasta
              </button>
            ) : (
              <form onSubmit={criarPasta} className="flex shrink-0 items-center gap-1">
                <input autoFocus value={novaPasta} placeholder="Nome da pasta"
                  onChange={(e) => setNovaPasta(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setNovaPasta(null) }}
                  className="w-40 rounded-full border border-acao bg-superficie px-3.5 py-1.5 text-sm outline-none" />
                <button aria-label="Criar pasta" className="rounded-full p-1.5 text-tinta hover:bg-superficie-2">
                  <Check size={18} />
                </button>
                <button type="button" aria-label="Cancelar" onClick={() => setNovaPasta(null)}
                  className="rounded-full p-1.5 text-texto-2 hover:bg-superficie-2">
                  <X size={18} />
                </button>
              </form>
            )}
          </div>
        </div>

        {pastaAtual && (
          <div className="mb-3 flex flex-wrap items-center gap-1">
            <h2 className="mr-auto font-display text-lg font-bold">{pastaAtual.nome}</h2>
            <button onClick={criar} disabled={criando} className="botao-secundario hidden px-3 py-1.5 text-sm md:inline-flex">
              <Plus size={16} /> Nova nesta pasta
            </button>
            <button onClick={() => renomearPasta(pastaAtual)} className="botao-fantasma px-3 py-1.5 text-sm">
              <Pencil size={16} /> Renomear
            </button>
            <button onClick={() => excluirPasta(pastaAtual)} className="botao-fantasma px-3 py-1.5 text-sm hover:text-perigo">
              <Trash2 size={16} /> Excluir
            </button>
          </div>
        )}

        {erro && <p role="alert" className="mb-3 rounded-xl bg-perigo/10 px-3 py-2 text-sm text-perigo">{erro}</p>}

        {mensagens === null && !erro && (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2" aria-label="Carregando">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="cartao h-[76px] animate-pulse bg-superficie-2/60" />
            ))}
          </ul>
        )}

        {mensagens?.length === 0 && !excluida && (
          <div className="cartao relative overflow-hidden px-6 py-12 text-center">
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-acao/20 blur-3xl" />
            <h2 className="relative font-display text-2xl font-extrabold">Comece sua primeira mensagem</h2>
            <p className="relative mx-auto mt-2 max-w-sm text-texto-2">
              Organize em tópicos, ligue os versículos e pregue com o telão acompanhando.
            </p>
            <button onClick={criar} disabled={criando} className="botao-primario relative mt-6">
              <Plus size={18} /> Nova mensagem
            </button>
          </div>
        )}

        {filtradas.length > 0 && (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
            {filtradas.map((m) => (
              <LinhaMensagem key={m.id} m={m} pastas={pastas} hoje={hoje}
                pasta={filtroAtivo === 'todas' ? pastas.find((p) => p.id === m.pasta_id) ?? null : null}
                menuAberto={menu === m.id}
                onAbrirMenu={() => setMenu(m.id)}
                onFecharMenu={() => setMenu(null)}
                onMover={(destino) => moverPara(m, destino)}
                onDuplicar={() => duplicar(m)}
                onExcluir={() => excluir(m)} />
            ))}
          </ul>
        )}

        {mensagens && mensagens.length > 0 && filtradas.length === 0 && (
          <p className="py-10 text-center text-texto-2">
            {termo ? `Nenhuma mensagem encontrada para "${busca}".` : 'Nenhuma mensagem nesta pasta.'}
          </p>
        )}
      </div>

      {/* Celular: botão flutuante de nova mensagem */}
      <button onClick={criar} disabled={criando} aria-label="Nova mensagem"
        className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] right-4 z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-acao text-acao-texto shadow-[0_10px_30px_-8px_var(--acao)] active:scale-95 disabled:opacity-60 md:hidden">
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Aviso de exclusão com Desfazer */}
      {excluida && (
        <div role="status"
          className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-4 right-[5.5rem] z-40 flex animate-entrar items-center gap-3 rounded-2xl bg-texto px-4 py-3 text-fundo shadow-xl md:bottom-6 md:left-1/2 md:right-auto md:w-[26rem] md:-translate-x-1/2">
          <Trash2 size={18} className="shrink-0 opacity-70" />
          <span className="min-w-0 flex-1 truncate text-sm">
            <b className="font-display">{excluida.titulo || 'Sem título'}</b> foi excluída
          </span>
          <button onClick={desfazerExclusao} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-acao hover:opacity-80">
            Desfazer
          </button>
        </div>
      )}

      <DragOverlay>
        {mensagemArrastada && (
          <div className="max-w-xs rotate-2 rounded-2xl border border-acao bg-superficie px-4 py-3 shadow-2xl">
            <p className="truncate font-display font-bold">{mensagemArrastada.titulo || 'Sem título'}</p>
            <p className="text-xs text-texto-2">Solte numa pasta</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
