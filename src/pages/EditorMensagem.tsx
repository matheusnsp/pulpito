import { lerVersao } from '../lib/preferencias'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  DndContext, PointerSensor, TouchSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent,
  type DraggableAttributes, type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen, CalendarDays, Check, ChevronDown, GripVertical, ChevronLeft, ChevronUp, CircleAlert, ClipboardCopy, Clock, FileDown, GraduationCap,
  ImagePlus, LoaderCircle, MessagesSquare, Play, Plus, Presentation, Redo2, Share2, Target, Timer, Trash2, Undo2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSalvamento } from '../lib/salvamento'
import { useHistorico } from '../lib/historico'
import { CAMPOS_TOPICO, type Mensagem, type Pasta, type Topico } from '../lib/tipos'
import { parseReferencia, formatarReferencia, lerReferencia } from '../lib/biblia'
import { esbocoEmTexto } from '../lib/mensagens'
import { BLOCOS, FORMATOS_PALAVRA, ICONE_FORMATO, ORDEM_BLOCOS, defBloco, ehBloco, itensDaLista, type TipoBloco } from '../lib/blocos'
import { CORES_OPCOES, LETRAS } from '../lib/aoVivo'
import { lerModo, salvarModo } from '../lib/criar'
import { enviarImagem } from '../lib/imagens'
import { useAuth } from '../lib/auth'
import type { DetalhesEstudo } from '../lib/tipos'

type Foto = { mensagem: Mensagem; topicos: Topico[] }
type EventoCurto = { id: string; titulo: string; inicio: string; local: string | null }

const CAMPOS_MSG = ['titulo', 'texto_base', 'tempo_minutos', 'pasta_id', 'detalhes'] as const
const CAMPOS_TOP = ['titulo', 'versiculo', 'observacao', 'aplicacao', 'ilustracao', 'frase_chave', 'notas', 'ordem', 'tipo', 'extra'] as const
const diferente = (a: unknown, b: unknown) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)

/* Mostra o texto do versículo enquanto a pessoa digita a referência */
function PreviaVersiculo({ texto }: { texto: string }) {
  const versao = lerVersao()
  const ref = parseReferencia(texto)
  const chave = ref ? `${versao}:${formatarReferencia(ref)}` : ''
  const [res, setRes] = useState<{ chave: string; texto: string } | null>(null)
  const [inteiro, setInteiro] = useState(false)

  useEffect(() => {
    const r = parseReferencia(texto)
    if (!r) return
    let ativo = true
    const k = `${versao}:${formatarReferencia(r)}`
    const timer = setTimeout(() => {
      lerReferencia(versao, r)
        .then((vs) => {
          const lista = r.inicio ? vs : vs.slice(0, 3)
          let t = lista.map((v) => `${v.numero} ${v.texto}`).join(' ')
          if (lista.length < vs.length) t += ' …'
          if (ativo) setRes({ chave: k, texto: t })
        })
        .catch(() => { if (ativo) setRes({ chave: k, texto: '' }) })
    }, 400)
    return () => { ativo = false; clearTimeout(timer) }
  }, [texto, versao])

  if (!texto.trim()) return null
  if (!ref) return <p className="mt-1.5 text-sm text-aviso">Referência não reconhecida. Tente Jo 3:16-18.</p>
  if (res?.chave !== chave) return <p className="mt-1.5 text-sm text-texto-2">Buscando {formatarReferencia(ref)}…</p>
  if (!res.texto) return <p className="mt-1.5 text-sm text-aviso">Versículo não encontrado.</p>
  return (
    <div className="mt-2 rounded-xl border-l-[3px] border-acao bg-ouro-suave/60 px-3.5 py-3">
      <p className="text-sm font-bold text-tinta">
        {formatarReferencia(ref)} <span className="font-normal text-texto-2">{versao}</span>
      </p>
      <p className={`mt-1 font-escritura leading-relaxed text-texto/90 ${inteiro ? '' : 'line-clamp-4'}`}>{res.texto}</p>
      {res.texto.length > 220 && (
        <button type="button" onClick={() => setInteiro((v) => !v)} className="mt-1 text-sm font-bold text-tinta">
          {inteiro ? 'Mostrar menos' : 'Ler tudo'}
        </button>
      )}
    </div>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-texto-2">{rotulo}</span>
      {children}
    </label>
  )
}

/* Tópico arrastável: a alça é o número; solta em cima de outro tópico para trocar de lugar */
function Arrastavel({ id, children }: {
  id: string
  children: (p: {
    alca: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners }
    sobre: boolean; arrastando: boolean
  }) => ReactNode
}) {
  const { attributes, listeners, setNodeRef: refArrasto, transform, isDragging } = useDraggable({ id })
  const { setNodeRef: refAlvo, isOver } = useDroppable({ id })
  return (
    <div ref={(n) => { refArrasto(n); refAlvo(n) }}
      style={transform ? { transform: `translate3d(0, ${transform.y}px, 0)`, zIndex: 30, position: 'relative' } : undefined}>
      {children({ alca: { attributes, listeners }, sobre: isOver && !isDragging, arrastando: isDragging })}
    </div>
  )
}

/* Título que quebra linha em vez de cortar (no celular o texto inteiro aparece). Enter não cria linha nova. */
function TituloCrescente({ value, onChange, onFocus, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; onFocus?: () => void; placeholder?: string; className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ajustar = () => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
    ajustar()
    // Reajusta quando a largura muda (ex.: botões aparecem ao abrir o tópico); a altura não dispara de novo
    let largura = el.clientWidth
    const obs = new ResizeObserver(() => {
      if (el.clientWidth === largura) return
      largura = el.clientWidth
      ajustar()
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [value])
  return (
    <textarea ref={ref} rows={1} value={value} placeholder={placeholder} onFocus={onFocus}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
      className={`block resize-none overflow-hidden ${className}`} />
  )
}

const iconeBotao = 'flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto disabled:opacity-25'

export default function EditorMensagem() {
  const { id } = useParams()
  const { status, agendar, cancelar } = useSalvamento()
  const historico = useHistorico<Foto>()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [aberto, setAberto] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [eventos, setEventos] = useState<EventoCurto[]>([])
  const { sessao } = useAuth()
  const [gerandoFolha, setGerandoFolha] = useState(false)
  const [enviandoImg, setEnviandoImg] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').eq('id', id!).maybeSingle(),
      supabase.from('topicos').select('*').eq('mensagem_id', id!).order('ordem'),
      supabase.from('pastas').select('id, nome').order('nome'),
      supabase.from('eventos').select('id, titulo, inicio, local').eq('mensagem_id', id!)
        .gte('inicio', new Date(Date.now() - 86_400_000).toISOString()).order('inicio'),
    ]).then(([m, t, p, ev]) => {
      if (!ativo) return
      setMensagem((m.data as Mensagem) ?? null)
      // Abrir um estudo leva o app para o lado Estudos (logo e menu acompanham), e vice-versa
      const tipo = (m.data as Mensagem | null)?.tipo === 'estudo' ? 'estudo' : 'pregacao'
      if (m.data && lerModo() !== tipo) salvarModo(tipo)
      setTopicos((t.data as Topico[]) ?? [])
      setPastas((p.data as Pasta[]) ?? [])
      setEventos((ev.data as EventoCurto[]) ?? [])
    })
    return () => { ativo = false }
  }, [id])

  // Atalhos de teclado: Cmd/Ctrl + Z desfaz; com Shift (ou Ctrl + Y) refaz
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); desfazerAgora() }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); refazerAgora() }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const foto = (): Foto => ({ mensagem: mensagem!, topicos })

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  )

  function aoSoltar(e: DragEndEvent) {
    if (!e.over) return
    const i = topicos.findIndex((t) => t.id === e.active.id)
    const j = topicos.findIndex((t) => t.id === e.over!.id)
    if (i >= 0 && j >= 0) moverPara(i, j)
  }

  function alterarMensagem(campos: Partial<Mensagem>) {
    if (!mensagem) return
    historico.registrar(foto(), `m:${Object.keys(campos).join(',')}`)
    setMensagem({ ...mensagem, ...campos })
    agendar(`m:${Object.keys(campos).join(',')}`, () =>
      supabase.from('mensagens').update(campos).eq('id', mensagem.id))
  }

  function alterarTopico(tid: string, campos: Partial<Topico>) {
    historico.registrar(foto(), `t:${tid}:${Object.keys(campos).join(',')}`)
    setTopicos((lista) => lista.map((t) => (t.id === tid ? { ...t, ...campos } : t)))
    agendar(`t:${tid}:${Object.keys(campos).join(',')}`, () =>
      supabase.from('topicos').update(campos).eq('id', tid))
  }

  async function adicionarTopico(tipo?: TipoBloco) {
    setErro('')
    const antes = foto()
    const ordem = topicos.length ? Math.max(...topicos.map((t) => t.ordem)) + 1 : 0
    const minutos = tipo ? BLOCOS[tipo].minutos : undefined
    const { data, error } = await supabase.from('topicos')
      .insert({ mensagem_id: id, ordem, ...(tipo ? { tipo, extra: minutos ? { minutos } : {} } : {}) }).select().single()
    if (error || !data) { setErro(tipo ? 'Não foi possível criar o bloco. Verifique a internet.' : 'Não foi possível criar o tópico. Verifique a internet.'); return }
    historico.registrar(antes)
    setTopicos((lista) => [...lista, data as Topico])
    setAberto(data.id)
  }

  async function excluirTopico(t: Topico) {
    historico.registrar(foto())
    cancelar(`t:${t.id}:`)
    setTopicos((lista) => lista.filter((x) => x.id !== t.id))
    const { error } = await supabase.from('topicos').delete().eq('id', t.id)
    if (error) setErro('Não foi possível excluir o tópico.')
  }

  function mover(i: number, dir: -1 | 1) {
    moverPara(i, i + dir)
  }

  function moverPara(i: number, j: number) {
    if (j < 0 || j >= topicos.length || i === j) return
    historico.registrar(foto())
    const lista = [...topicos]
    const [item] = lista.splice(i, 1)
    lista.splice(j, 0, item)
    const renumerada = lista.map((t, k) => ({ ...t, ordem: k }))
    setTopicos(renumerada)
    renumerada.forEach((t, k) => {
      if (topicos.find((o) => o.id === t.id)?.ordem !== k)
        agendar(`t:${t.id}:ordem`, () => supabase.from('topicos').update({ ordem: k }).eq('id', t.id))
    })
  }

  /* Leva a tela e o banco para uma foto anterior (ou posterior) */
  async function aplicar(destino: Foto) {
    if (!mensagem) return
    const atual = foto()
    setMensagem(destino.mensagem)
    setTopicos(destino.topicos)

    for (const k of CAMPOS_MSG) {
      if (diferente(destino.mensagem[k], atual.mensagem[k])) {
        const valor = destino.mensagem[k]
        agendar(`m:${k}`, () => supabase.from('mensagens').update({ [k]: valor }).eq('id', destino.mensagem.id))
      }
    }

    const antes = new Map(atual.topicos.map((t) => [t.id, t]))
    const depois = new Set(destino.topicos.map((t) => t.id))

    for (const t of destino.topicos) {
      const a = antes.get(t.id)
      if (!a) continue
      for (const k of CAMPOS_TOP) {
        if (diferente(t[k], a[k])) {
          const valor = t[k]
          agendar(`t:${t.id}:${k}`, () => supabase.from('topicos').update({ [k]: valor }).eq('id', t.id))
        }
      }
    }

    const recriar = destino.topicos.filter((t) => !antes.has(t.id))
    const remover = atual.topicos.filter((t) => !depois.has(t.id)).map((t) => t.id)
    remover.forEach((tid) => cancelar(`t:${tid}:`))

    if (recriar.length) {
      const { error } = await supabase.from('topicos').upsert(recriar)
      if (error) setErro('Não foi possível restaurar o tópico. Verifique a internet.')
    }
    if (remover.length) {
      const { error } = await supabase.from('topicos').delete().in('id', remover)
      if (error) setErro('Não foi possível desfazer. Verifique a internet.')
    }
  }

  function desfazerAgora() {
    if (!mensagem) return
    const f = historico.desfazer(foto())
    if (f) aplicar(f)
  }

  function refazerAgora() {
    if (!mensagem) return
    const f = historico.refazer(foto())
    if (f) aplicar(f)
  }

  function alterarDetalhes(campos: Partial<DetalhesEstudo>) {
    if (!mensagem) return
    alterarMensagem({ detalhes: { ...(mensagem.detalhes ?? {}), ...campos } })
  }

  function alterarExtra(t: Topico, campos: Partial<NonNullable<Topico['extra']>>) {
    alterarTopico(t.id, { extra: { ...(t.extra ?? {}), ...campos } })
  }

  async function subirImagemDoBloco(t: Topico, file: File) {
    if (!sessao) return
    setEnviandoImg(t.id)
    setErro('')
    try { alterarExtra(t, { url: await enviarImagem(sessao.user.id, file) }) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível enviar a imagem.') }
    finally { setEnviandoImg(null) }
  }

  async function baixarFolha() {
    if (!mensagem) return
    setGerandoFolha(true)
    try {
      const { gerarFolhaAluno } = await import('../lib/folhaAluno')
      await gerarFolhaAluno(mensagem, topicos)
    } catch { setErro('Não foi possível gerar a folha do aluno.') }
    finally { setGerandoFolha(false) }
  }

  async function compartilharEsboco() {
    if (!mensagem) return
    const texto = esbocoEmTexto(mensagem, topicos)
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title: mensagem.titulo, text: texto }) } catch { /* cancelado */ }
      return
    }
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch { setErro('Não foi possível copiar o esboço.') }
  }

  if (mensagem === undefined) return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-16 md:px-8" aria-label="Carregando">
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-superficie-2" />
      <div className="h-24 animate-pulse rounded-2xl bg-superficie-2" />
      <div className="h-16 animate-pulse rounded-2xl bg-superficie-2" />
    </div>
  )
  if (mensagem === null) return (
    <div className="p-6">
      <p className="mb-3">Mensagem não encontrada.</p>
      <Link to="/" className="botao-secundario">Voltar para mensagens</Link>
    </div>
  )

  const indicador = {
    salvo: <><Check size={16} /> Salvo</>,
    salvando: <><LoaderCircle size={16} className="animate-spin" /> Salvando</>,
    erro: <><CircleAlert size={16} /> Não salvou</>,
  }[status]

  const estudo = mensagem.tipo === 'estudo'
  const detalhes = mensagem.detalhes ?? {}
  // Lado Palavra: formato (célula, EBD…) e se já tem blocos misturados aos tópicos
  const formato = !estudo ? (detalhes.formato ?? 'pregacao') : null
  const temBlocos = topicos.some((t) => ehBloco(t.tipo))
  const comBlocos = estudo || temBlocos || (formato !== null && formato !== 'pregacao')
  const IconeFormato = formato ? ICONE_FORMATO[formato] ?? ICONE_FORMATO.pregacao : GraduationCap
  const acaoNome = estudo ? 'Dar aula' : formato === 'pregacao' ? 'Pregar' : 'Começar'
  const minutosBlocos = topicos.reduce((s, t) => s + (t.extra?.minutos ?? 0), 0)

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 md:px-8 lg:max-w-6xl">
      {/* Barra do topo (fixa ao rolar) */}
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-1 bg-fundo/90 px-4 py-2 backdrop-blur md:-mx-8 md:px-8 md:py-4">
        <Link to="/" className="botao-fantasma -ml-2 px-2">
          <ChevronLeft size={20} /> <span className="hidden sm:inline">Início</span>
        </Link>
        <span className={`ml-auto mr-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status === 'erro' ? 'bg-perigo/10 text-perigo' : 'text-texto-2'}`}>
          {indicador}
        </span>
        <button onClick={desfazerAgora} disabled={!historico.podeDesfazer}
          aria-label="Desfazer" title="Desfazer (Cmd + Z)" className={iconeBotao}>
          <Undo2 size={18} />
        </button>
        <button onClick={refazerAgora} disabled={!historico.podeRefazer}
          aria-label="Refazer" title="Refazer (Cmd + Shift + Z)" className={iconeBotao}>
          <Redo2 size={18} />
        </button>
        <Link to={`/pregar/${mensagem.id}`} className="botao-primario ml-1 px-3 py-2 text-sm sm:hidden">
          <Play size={16} fill="currentColor" /> {acaoNome}
        </Link>
      </div>

      {/* Computador: conteúdo à esquerda e, à direita, uma coluna fixa com ações e dados */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-x-10 lg:[grid-template-areas:'titulo_lado'_'corpo_lado']">
      <div className="min-w-0 lg:[grid-area:titulo]">
      {estudo ? (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#14B8A6]/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#14B8A6]">
          <GraduationCap size={13} /> Estudo
        </span>
      ) : (
        <label className="relative mt-2 inline-flex items-center gap-1.5 rounded-full bg-ouro-suave py-1 pl-2.5 pr-2 text-[11px] font-extrabold uppercase tracking-wider text-tinta"
          title="Trocar o formato">
          <IconeFormato size={13} /> Palavra ·
          <select value={formato ?? 'pregacao'} onChange={(e) => alterarDetalhes({ formato: e.target.value })} aria-label="Formato"
            className="cursor-pointer appearance-none bg-transparent pr-4 font-extrabold uppercase tracking-wider outline-none">
            {FORMATOS_PALAVRA.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2" />
        </label>
      )}

      {/* Título */}
      <TituloCrescente value={mensagem.titulo} onChange={(v) => alterarMensagem({ titulo: v })}
        placeholder={estudo ? 'Título do estudo' : 'Título da mensagem'}
        className="mt-2 w-full bg-transparent font-display text-2xl font-extrabold leading-tight tracking-tight outline-none placeholder:text-texto-2/50 sm:text-3xl md:text-4xl" />

      </div>

      <div className="lg:sticky lg:top-24 lg:self-start lg:[grid-area:lado] lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pb-4 sem-barra">
      <div className={`mt-4 grid gap-2 sm:flex sm:flex-wrap lg:mt-2 lg:grid lg:grid-cols-2 ${comBlocos ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Link to={`/pregar/${mensagem.id}`} className="botao-primario hidden sm:inline-flex lg:col-span-2">
          <Play size={18} fill="currentColor" /> {acaoNome}
        </Link>
        <Link to={`/mensagem/${mensagem.id}/slides`} className={`botao-secundario ${comBlocos ? 'max-sm:px-2 max-sm:text-sm' : ''}`}>
          <Presentation size={18} /> Slides
        </Link>
        <button onClick={compartilharEsboco} disabled={topicos.length === 0 && !mensagem.texto_base} className={`botao-secundario ${comBlocos ? 'max-sm:px-2 max-sm:text-sm' : ''}`}>
          {copiado ? <><Check size={18} className="text-sucesso" /> Copiado</>
            : <><span className="sm:hidden"><Share2 size={18} /></span><span className="hidden sm:inline"><ClipboardCopy size={18} /></span> {comBlocos ? 'Roteiro' : 'Esboço'}</>}
        </button>
        {comBlocos && (
          <Link to={`/mensagem/${mensagem.id}/respostas`} className="botao-secundario max-sm:order-last max-sm:col-span-3 max-sm:text-sm lg:order-last lg:px-3">
            <MessagesSquare size={18} /> {estudo ? "Respostas das aulas" : "Respostas"}
          </Link>
        )}
        {comBlocos && (
          <button onClick={baixarFolha} disabled={gerandoFolha || topicos.length === 0} className="botao-secundario max-sm:px-2 max-sm:text-sm">
            {gerandoFolha ? <LoaderCircle size={18} className="animate-spin" /> : <FileDown size={18} />} <span className="sm:hidden">Folha</span><span className="hidden sm:inline">{estudo ? 'Folha do aluno' : 'Folha impressa'}</span>
          </button>
        )}
      </div>

      {/* Dados da mensagem */}
      <div className="cartao mt-6 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 p-4">
        {comBlocos && (
          <>
            <div className="col-span-2">
              <Campo rotulo="Objetivo">
                <div className="relative">
                  <Target size={18} className="pointer-events-none absolute left-3.5 top-3 text-texto-2" />
                  <textarea rows={2} value={detalhes.objetivo ?? ''} placeholder={estudo ? 'Ao final, a turma consegue…' : 'O que as pessoas levam para a semana'}
                    onChange={(e) => alterarDetalhes({ objetivo: e.target.value })} className="campo resize-y pl-10 leading-relaxed" />
                </div>
              </Campo>
            </div>
            <Campo rotulo="Público">
              <input value={detalhes.publico ?? ''} placeholder={estudo ? 'Jovens, equipe, turma…' : 'Célula, classe, discípulo…'}
                onChange={(e) => alterarDetalhes({ publico: e.target.value })} className="campo" />
            </Campo>
            <Campo rotulo="Material">
              <input value={detalhes.material ?? ''} placeholder="Papel e caneta"
                onChange={(e) => alterarDetalhes({ material: e.target.value })} className="campo" />
            </Campo>
            <details className="col-span-2 rounded-xl border border-borda px-3 py-2.5" open={!!(detalhes.esperaTitulo || detalhes.esperaTexto)}>
              <summary className="cursor-pointer text-sm font-semibold text-texto-2">Mensagem de espera para a turma</summary>
              <p className="mt-1 text-xs text-texto-2">Aparece no celular dos alunos, nas respostas ao vivo, enquanto não tem pergunta na tela.</p>
              <div className="mt-3 space-y-2">
                <input value={detalhes.esperaTitulo ?? ''} placeholder="Preste atenção na aula" maxLength={80}
                  onChange={(e) => alterarDetalhes({ esperaTitulo: e.target.value })} className="campo font-semibold" />
                <textarea rows={2} value={detalhes.esperaTexto ?? ''} placeholder="Quando chegar uma pergunta, ela aparece aqui." maxLength={240}
                  onChange={(e) => alterarDetalhes({ esperaTexto: e.target.value })} className="campo resize-y" />
              </div>
            </details>
          </>
        )}
        <div className="col-span-2">
        <Campo rotulo={estudo ? 'Texto bíblico (opcional)' : 'Texto base'}>
          <div className="relative">
            <BookOpen size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
            <input value={mensagem.texto_base ?? ''} placeholder="Rm 8:28"
              onChange={(e) => alterarMensagem({ texto_base: e.target.value })} className="campo pl-10" />
          </div>
          <PreviaVersiculo texto={mensagem.texto_base ?? ''} />
        </Campo>
        </div>
        <Campo rotulo={estudo ? 'Duração' : 'Tempo'}>
          <div className="relative">
            <Clock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
            <input type="number" min={1} max={300} value={mensagem.tempo_minutos}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value))
                if (n >= 1 && n <= 300) alterarMensagem({ tempo_minutos: n })
              }}
              className="campo pl-10 pr-12" />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-texto-2">min</span>
          </div>
        </Campo>
        <Campo rotulo="Pasta">
          <select value={mensagem.pasta_id ?? ''} className="campo"
            onChange={(e) => alterarMensagem({ pasta_id: e.target.value || null })}>
            <option value="">Sem pasta</option>
            {pastas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Campo>
        <div className="col-span-2 -mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Tempo rápido">
          {[20, 30, 40, 50, 60, 90].map((n) => (
            <button key={n} type="button" onClick={() => alterarMensagem({ tempo_minutos: n })}
              aria-pressed={mensagem.tempo_minutos === n}
              className={`rounded-full border px-3 py-1 text-sm font-bold tabular-nums transition-colors ${mensagem.tempo_minutos === n
                ? 'border-acao bg-acao text-acao-texto' : 'border-borda text-texto-2 hover:border-texto-2 hover:text-texto'}`}>
              {n} min
            </button>
          ))}
        </div>
      </div>

      {/* Compromissos ligados a esta mensagem */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-texto-2"><CalendarDays size={16} /> Agenda:</span>
        {eventos.map((e) => (
          <Link key={e.id} to="/agenda" className="rounded-full bg-ouro-suave px-3 py-1 text-sm font-bold text-tinta">
            {e.titulo} · {new Date(e.inicio).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}
            {' '}{new Date(e.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Link>
        ))}
        <Link to={`/agenda?mensagem=${mensagem.id}`} className="inline-flex items-center gap-1 rounded-full border border-dashed border-borda px-3 py-1 text-sm font-bold text-texto-2 hover:border-acao hover:text-texto">
          <Plus size={14} /> {eventos.length ? 'Marcar outro' : 'Marcar na agenda'}
        </Link>
      </div>

      </div>

      <div className="min-w-0 lg:[grid-area:corpo]">
      {/* Tópicos */}
      <div className="mt-10 flex items-baseline justify-between lg:mt-6">
        <h2 className="font-display text-2xl font-extrabold">{estudo ? 'Blocos' : comBlocos ? 'Roteiro' : 'Tópicos'}</h2>
        {topicos.length > 0 && (
          <span className="text-sm text-texto-2">
            {comBlocos
              ? `${topicos.length} · ${minutosBlocos ? `${minutosBlocos} min em perguntas e atividades` : `${mensagem.tempo_minutos} min no total`}`
              : `${topicos.length} · cerca de ${Math.max(1, Math.round(mensagem.tempo_minutos / topicos.length))} min cada`}
          </span>
        )}
      </div>

      {topicos.length === 0 && (
        <p className="mt-2 text-texto-2">
          {comBlocos
            ? estudo ? 'Monte o estudo empilhando blocos: explicação, pergunta, atividade, lista e mais. Cada bloco vira um passo da aula e um slide.'
              : 'Misture tópicos e blocos (pergunta, atividade, lista…). Cada item vira um passo e um slide.'
            : 'Cada tópico vira um ponto da pregação e um slide no telão.'}
        </p>
      )}
      {erro && <p role="alert" className="mt-3 text-sm text-perigo">{erro}</p>}

      <DndContext sensors={sensores} onDragEnd={aoSoltar} collisionDetection={pointerWithin}>
      <ol className="mt-4 space-y-3">
        {topicos.map((t, i) => {
          const estaAberto = aberto === t.id
          const def = estudo || ehBloco(t.tipo) ? defBloco(t) : null
          const tipoB = (t.tipo ?? 'explicacao') as TipoBloco
          return (
            <Arrastavel key={t.id} id={t.id}>
            {({ alca, sobre, arrastando }) => (
            <li className={`rounded-2xl border bg-superficie shadow-cartao transition-[border-color,box-shadow] ${arrastando ? 'scale-[1.01] shadow-2xl' : ''} ${sobre ? 'border-acao ring-4 ring-acao/30' : estaAberto ? 'border-acao ring-4 ring-acao/15' : 'border-borda'}`}>
              <div className="flex items-center gap-3 p-3 pl-4">
                {def ? (
                  <button type="button" {...alca.attributes} {...alca.listeners}
                    aria-label={`Arrastar bloco ${i + 1}`} title="Arraste para reordenar"
                    className="group/alca relative flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl active:cursor-grabbing"
                    style={{ background: `${def.cor}26`, color: def.cor }}>
                    <def.Icone size={18} className="md:group-hover/alca:opacity-0" />
                    <GripVertical size={16} className="absolute opacity-0 md:group-hover/alca:opacity-100" />
                  </button>
                ) : (
                <button type="button" {...alca.attributes} {...alca.listeners}
                  aria-label={`Arrastar tópico ${i + 1}`} title="Arraste para reordenar"
                  className={`group/alca relative flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-full font-display text-sm font-extrabold active:cursor-grabbing ${estaAberto || arrastando ? 'bg-acao text-acao-texto' : 'bg-ouro-suave text-tinta'}`}>
                  <span className="md:group-hover/alca:opacity-0">{i + 1}</span>
                  <GripVertical size={16} className="absolute opacity-0 md:group-hover/alca:opacity-100" />
                </button>
                )}
                <div className="min-w-0 flex-1">
                  {def && (
                    <p className="mb-0.5 flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: def.cor }}>
                      {i + 1} · {def.nome}
                      {t.extra?.minutos ? <span className="flex items-center gap-1 font-bold normal-case tracking-normal text-texto-2"><Timer size={11} /> {t.extra.minutos} min</span> : null}
                    </p>
                  )}
                  <TituloCrescente value={t.titulo} placeholder={def ? def.titulo.dica : 'Título do tópico'}
                    onChange={(v) => alterarTopico(t.id, { titulo: v })}
                    onFocus={() => setAberto(t.id)}
                    className="w-full bg-transparent font-display text-lg font-bold leading-snug outline-none placeholder:text-texto-2/50 md:text-xl" />
                  {!estaAberto && t.versiculo && <p className="truncate text-sm font-semibold text-tinta">{t.versiculo}</p>}
                  {!estaAberto && def && tipoB === 'lista' && itensDaLista(t.observacao).length > 0 && (
                    <p className="truncate text-sm text-texto-2">{itensDaLista(t.observacao).join(' · ')}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir tópico" className={`${iconeBotao} ${estaAberto ? '' : 'max-sm:hidden'}`}>
                    <ChevronUp size={18} />
                  </button>
                  <button onClick={() => mover(i, 1)} disabled={i === topicos.length - 1} aria-label="Descer tópico" className={`${iconeBotao} ${estaAberto ? '' : 'max-sm:hidden'}`}>
                    <ChevronDown size={18} />
                  </button>
                  <button onClick={() => setAberto(estaAberto ? null : t.id)} aria-expanded={estaAberto}
                    aria-label={estaAberto ? 'Fechar tópico' : 'Editar tópico'}
                    className="ml-1 rounded-xl border border-borda p-1.5 text-sm font-bold text-texto-2 hover:text-texto sm:px-3">
                    <span className="hidden sm:inline">{estaAberto ? 'Fechar' : 'Editar'}</span>
                    <ChevronDown size={18} className={`transition-transform sm:hidden ${estaAberto ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {estaAberto && def && (
                <div className="space-y-5 border-t border-borda p-4">
                  {def.corpo && (
                    <Campo rotulo={def.corpo.rotulo}>
                      <textarea rows={def.corpo.linhas ?? 3} placeholder={def.corpo.dica} value={t.observacao ?? ''}
                        onChange={(e) => alterarTopico(t.id, { observacao: e.target.value })} className="campo resize-y leading-relaxed" />
                    </Campo>
                  )}
                  {def.detalhe && (
                    <Campo rotulo={def.detalhe.rotulo}>
                      <input value={t.frase_chave ?? ''} placeholder={def.detalhe.dica}
                        onChange={(e) => alterarTopico(t.id, { frase_chave: e.target.value })} className="campo" />
                    </Campo>
                  )}
                  {def.autor && (
                    <Campo rotulo="Autor ou fonte">
                      <input value={t.extra?.autor ?? ''} placeholder="Jesus, em Lucas 16:10"
                        onChange={(e) => alterarExtra(t, { autor: e.target.value })} className="campo" />
                    </Campo>
                  )}
                  {def.referencia && (
                    <Campo rotulo="Referência bíblica (opcional)">
                      <div className="relative">
                        <BookOpen size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
                        <input value={t.versiculo ?? ''} placeholder="Jo 3:16"
                          onChange={(e) => alterarTopico(t.id, { versiculo: e.target.value })} className="campo pl-10" />
                      </div>
                      <PreviaVersiculo texto={t.versiculo ?? ''} />
                    </Campo>
                  )}
                  {def.url === 'link' && (
                    <Campo rotulo="Endereço">
                      <input value={t.extra?.url ?? ''} placeholder="https://youtube.com/…" inputMode="url"
                        onChange={(e) => alterarExtra(t, { url: e.target.value })} className="campo" />
                    </Campo>
                  )}
                  {def.url === 'imagem' && (
                    <div className="space-y-2">
                      {t.extra?.url && <img src={t.extra.url} alt={t.titulo || 'Imagem do bloco'} className="max-h-64 rounded-xl border border-borda object-contain" />}
                      <label className="botao-secundario cursor-pointer">
                        {enviandoImg === t.id ? <LoaderCircle size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                        {t.extra?.url ? 'Trocar imagem' : 'Escolher imagem'}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) subirImagemDoBloco(t, f); e.target.value = '' }} />
                      </label>
                    </div>
                  )}
                  {tipoB === 'pergunta' && (
                    <div className="space-y-2">
                      <span className="block text-sm font-semibold text-texto-2">Tipo de resposta</span>
                      <div className="flex rounded-xl border border-borda p-1">
                        {([['aberta', 'Aberta'], ['multipla', 'Múltipla escolha']] as const).map(([v, n]) => {
                          const ativo = (v === 'multipla') === !!t.extra?.opcoes
                          return (
                            <button key={v} type="button" onClick={() => alterarExtra(t, v === 'multipla' ? { opcoes: t.extra?.opcoes ?? ['', ''], correta: t.extra?.correta ?? 0 } : { opcoes: undefined, correta: undefined })}
                              className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${ativo ? 'bg-acao text-acao-texto' : 'text-texto-2'}`}>{n}</button>
                          )
                        })}
                      </div>
                      {t.extra?.opcoes && (
                        <div className="space-y-2">
                          {t.extra.opcoes.map((op, k) => (
                            <div key={k} className="flex items-center gap-2">
                              <button type="button" onClick={() => alterarExtra(t, { correta: k })} aria-label={`Marcar opção ${LETRAS[k]} como certa`}
                                title="Resposta certa"
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-extrabold text-white ${t.extra?.correta === k ? 'ring-2 ring-sucesso ring-offset-2 ring-offset-superficie' : 'opacity-70'}`}
                                style={{ background: CORES_OPCOES[k] }}>
                                {t.extra?.correta === k ? <Check size={18} /> : LETRAS[k]}
                              </button>
                              <input value={op} placeholder={`Opção ${LETRAS[k]}`} className="campo"
                                onChange={(e) => alterarExtra(t, { opcoes: t.extra!.opcoes!.map((x, j) => (j === k ? e.target.value : x)) })} />
                              {t.extra!.opcoes!.length > 2 && (
                                <button type="button" aria-label="Tirar opção" onClick={() => {
                                  const opcoes = t.extra!.opcoes!.filter((_, j) => j !== k)
                                  const c = t.extra?.correta ?? 0
                                  alterarExtra(t, { opcoes, correta: c === k ? 0 : c > k ? c - 1 : c })
                                }} className={iconeBotao}><Trash2 size={16} /></button>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center justify-between">
                            {t.extra.opcoes.length < 6 && (
                              <button type="button" onClick={() => alterarExtra(t, { opcoes: [...t.extra!.opcoes!, ''] })} className="botao-fantasma -ml-2 px-2 text-sm">
                                <Plus size={16} /> Opção
                              </button>
                            )}
                            <span className="text-xs text-texto-2">Toque na letra para marcar a certa</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {def.minutos !== undefined && (
                    <div>
                      <span className="mb-1.5 block text-sm font-semibold text-texto-2">Tempo {tipoB === 'pergunta' ? 'de discussão' : 'da atividade'}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[0, 3, 5, 10, 15, 20].map((n) => (
                          <button key={n} type="button" onClick={() => alterarExtra(t, { minutos: n || undefined })}
                            aria-pressed={(t.extra?.minutos ?? 0) === n}
                            className={`rounded-full border px-3 py-1 text-sm font-bold tabular-nums ${(t.extra?.minutos ?? 0) === n ? 'border-acao bg-acao text-acao-texto' : 'border-borda text-texto-2'}`}>
                            {n ? `${n} min` : 'Sem tempo'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Campo rotulo="Só para você (não aparece para a turma)">
                    <textarea rows={2} placeholder="Lembretes, uma história para contar, o que fazer se ninguém responder…" value={t.notas ?? ''}
                      onChange={(e) => alterarTopico(t.id, { notas: e.target.value })} className="campo resize-y leading-relaxed" />
                  </Campo>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-texto-2">
                      Tipo
                      <select value={tipoB} onChange={(e) => alterarTopico(t.id, { tipo: e.target.value })} className="campo w-auto py-1.5">
                        {!estudo && <option value="topico">Tópico</option>}
                        {ORDEM_BLOCOS.map((k) => <option key={k} value={k}>{BLOCOS[k].nome}</option>)}
                      </select>
                    </label>
                    <button onClick={() => excluirTopico(t)} className="botao-fantasma ml-auto px-2 text-sm hover:text-perigo">
                      <Trash2 size={16} /> Excluir bloco
                    </button>
                  </div>
                </div>
              )}

              {estaAberto && !def && (
                <div className="space-y-5 border-t border-borda p-4">
                  <Campo rotulo="Versículo base">
                    <div className="relative">
                      <BookOpen size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
                      <input value={t.versiculo ?? ''} placeholder="Jo 3:16"
                        onChange={(e) => alterarTopico(t.id, { versiculo: e.target.value })} className="campo pl-10" />
                    </div>
                    <PreviaVersiculo texto={t.versiculo ?? ''} />
                  </Campo>

                  {CAMPOS_TOPICO.map((c) => (
                    <Campo key={c.chave} rotulo={c.rotulo}>
                      <textarea rows={c.chave === 'frase_chave' ? 2 : 3} placeholder={c.dica}
                        value={t[c.chave] ?? ''}
                        onChange={(e) => alterarTopico(t.id, { [c.chave]: e.target.value } as Partial<Topico>)}
                        className={`campo resize-y leading-relaxed ${c.chave === 'frase_chave' ? 'border-l-4 border-l-ouro font-semibold' : ''}`} />
                    </Campo>
                  ))}

                  <button onClick={() => excluirTopico(t)} className="botao-fantasma -ml-2 px-2 text-sm hover:text-perigo">
                    <Trash2 size={16} /> Excluir tópico
                  </button>
                </div>
              )}
            </li>
            )}
            </Arrastavel>
          )
        })}
      </ol>
      </DndContext>

      {estudo ? (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-borda p-3">
          <p className="mb-2.5 flex items-center justify-center gap-2 font-bold text-texto-2"><Plus size={18} /> Adicionar bloco</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {ORDEM_BLOCOS.map((k) => {
              const b = BLOCOS[k]
              return (
                <button key={k} onClick={() => adicionarTopico(k)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-borda bg-superficie px-1 py-2.5 text-xs font-bold transition-colors hover:border-acao">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${b.cor}26`, color: b.cor }}><b.Icone size={17} /></span>
                  <span className="truncate">{b.nome}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
      <div className="mt-3 rounded-2xl border-2 border-dashed border-borda p-2">
        <button onClick={() => adicionarTopico()}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-texto-2 transition-colors hover:bg-ouro-suave/50 hover:text-tinta">
          <Plus size={18} /> Adicionar tópico
        </button>
        <div className="flex items-center gap-1.5 overflow-x-auto px-1 pb-1 pt-1.5 sem-barra sm:flex-wrap sm:justify-center sm:overflow-visible">
          <span className="shrink-0 pr-1 text-xs font-bold text-texto-2">Inserir</span>
          {ORDEM_BLOCOS.map((k) => {
            const b = BLOCOS[k]
            return (
              <button key={k} onClick={() => adicionarTopico(k)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-borda bg-superficie py-1 pl-1 pr-2.5 text-xs font-bold transition-colors hover:border-acao">
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: `${b.cor}26`, color: b.cor }}><b.Icone size={13} /></span>
                {b.nome}
              </button>
            )
          })}
        </div>
      </div>
      )}
      </div>
      </div>
    </div>
  )
}
