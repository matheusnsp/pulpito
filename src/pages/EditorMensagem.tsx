import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  DndContext, PointerSensor, TouchSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent,
  type DraggableAttributes, type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen, CalendarDays, Check, ChevronDown, GripVertical, ChevronLeft, ChevronUp, CircleAlert, ClipboardCopy, Clock, LoaderCircle,
  Play, Plus, Presentation, Redo2, Share2, Trash2, Undo2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSalvamento } from '../lib/salvamento'
import { useHistorico } from '../lib/historico'
import { CAMPOS_TOPICO, type Mensagem, type Pasta, type Topico } from '../lib/tipos'
import { parseReferencia, formatarReferencia, lerReferencia, type VersaoId } from '../lib/biblia'
import { esbocoEmTexto } from '../lib/mensagens'

type Foto = { mensagem: Mensagem; topicos: Topico[] }
type EventoCurto = { id: string; titulo: string; inicio: string; local: string | null }

const CAMPOS_MSG = ['titulo', 'texto_base', 'tempo_minutos', 'pasta_id'] as const
const CAMPOS_TOP = ['titulo', 'versiculo', 'observacao', 'aplicacao', 'ilustracao', 'frase_chave', 'notas', 'ordem'] as const

/* Mostra o texto do versículo enquanto a pessoa digita a referência */
function PreviaVersiculo({ texto }: { texto: string }) {
  const versao = (localStorage.getItem('pulpito-versao') as VersaoId) || 'ARA'
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
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
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

  async function adicionarTopico() {
    setErro('')
    const antes = foto()
    const ordem = topicos.length ? Math.max(...topicos.map((t) => t.ordem)) + 1 : 0
    const { data, error } = await supabase.from('topicos')
      .insert({ mensagem_id: id, ordem }).select().single()
    if (error || !data) { setErro('Não foi possível criar o tópico. Verifique a internet.'); return }
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
      if (destino.mensagem[k] !== atual.mensagem[k]) {
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
        if (t[k] !== a[k]) {
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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 md:px-8">
      {/* Barra do topo (fixa ao rolar) */}
      <div className="sticky top-0 z-20 -mx-4 flex items-center gap-1 bg-fundo/90 px-4 py-2 backdrop-blur md:-mx-8 md:px-8 md:py-4">
        <Link to="/" className="botao-fantasma -ml-2 px-2">
          <ChevronLeft size={20} /> <span className="hidden sm:inline">Mensagens</span>
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
          <Play size={16} fill="currentColor" /> Pregar
        </Link>
      </div>

      {/* Título */}
      <TituloCrescente value={mensagem.titulo} onChange={(v) => alterarMensagem({ titulo: v })}
        placeholder="Título da mensagem"
        className="mt-2 w-full bg-transparent font-display text-2xl font-extrabold leading-tight tracking-tight outline-none placeholder:text-texto-2/50 sm:text-3xl md:text-4xl" />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Link to={`/pregar/${mensagem.id}`} className="botao-primario hidden sm:inline-flex">
          <Play size={18} fill="currentColor" /> Pregar
        </Link>
        <Link to={`/mensagem/${mensagem.id}/slides`} className="botao-secundario">
          <Presentation size={18} /> Slides
        </Link>
        <button onClick={compartilharEsboco} disabled={topicos.length === 0 && !mensagem.texto_base} className="botao-secundario">
          {copiado ? <><Check size={18} className="text-sucesso" /> Copiado</>
            : <><span className="sm:hidden"><Share2 size={18} /></span><span className="hidden sm:inline"><ClipboardCopy size={18} /></span> Esboço</>}
        </button>
      </div>

      {/* Dados da mensagem */}
      <div className="cartao mt-6 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 p-4">
        <div className="col-span-2">
        <Campo rotulo="Texto base">
          <div className="relative">
            <BookOpen size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
            <input value={mensagem.texto_base ?? ''} placeholder="Rm 8:28"
              onChange={(e) => alterarMensagem({ texto_base: e.target.value })} className="campo pl-10" />
          </div>
          <PreviaVersiculo texto={mensagem.texto_base ?? ''} />
        </Campo>
        </div>
        <Campo rotulo="Tempo">
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

      {/* Tópicos */}
      <div className="mt-10 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-extrabold">Tópicos</h2>
        {topicos.length > 0 && (
          <span className="text-sm text-texto-2">
            {topicos.length} · cerca de {Math.max(1, Math.round(mensagem.tempo_minutos / topicos.length))} min cada
          </span>
        )}
      </div>

      {topicos.length === 0 && (
        <p className="mt-2 text-texto-2">Cada tópico vira um ponto da pregação e um slide no telão.</p>
      )}
      {erro && <p role="alert" className="mt-3 text-sm text-perigo">{erro}</p>}

      <DndContext sensors={sensores} onDragEnd={aoSoltar} collisionDetection={pointerWithin}>
      <ol className="mt-4 space-y-3">
        {topicos.map((t, i) => {
          const estaAberto = aberto === t.id
          return (
            <Arrastavel key={t.id} id={t.id}>
            {({ alca, sobre, arrastando }) => (
            <li className={`rounded-2xl border bg-superficie shadow-cartao transition-[border-color,box-shadow] ${arrastando ? 'scale-[1.01] shadow-2xl' : ''} ${sobre ? 'border-acao ring-4 ring-acao/30' : estaAberto ? 'border-acao ring-4 ring-acao/15' : 'border-borda'}`}>
              <div className="flex items-center gap-3 p-3 pl-4">
                <button type="button" {...alca.attributes} {...alca.listeners}
                  aria-label={`Arrastar tópico ${i + 1}`} title="Arraste para reordenar"
                  className={`group/alca relative flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-full font-display text-sm font-extrabold active:cursor-grabbing ${estaAberto || arrastando ? 'bg-acao text-acao-texto' : 'bg-ouro-suave text-tinta'}`}>
                  <span className="md:group-hover/alca:opacity-0">{i + 1}</span>
                  <GripVertical size={16} className="absolute opacity-0 md:group-hover/alca:opacity-100" />
                </button>
                <div className="min-w-0 flex-1">
                  <TituloCrescente value={t.titulo} placeholder="Título do tópico"
                    onChange={(v) => alterarTopico(t.id, { titulo: v })}
                    onFocus={() => setAberto(t.id)}
                    className="w-full bg-transparent font-display text-lg font-bold leading-snug outline-none placeholder:text-texto-2/50 md:text-xl" />
                  {!estaAberto && t.versiculo && <p className="truncate text-sm font-semibold text-tinta">{t.versiculo}</p>}
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

              {estaAberto && (
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

      <button onClick={adicionarTopico}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-borda py-4 font-bold text-texto-2 transition-colors hover:border-acao hover:bg-ouro-suave/50 hover:text-tinta">
        <Plus size={18} /> Adicionar tópico
      </button>
    </div>
  )
}