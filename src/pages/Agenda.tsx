import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MapPin, Play, Plus, Trash2, X } from 'lucide-react'
import { visivel } from '../lib/lixeira'
import type { Mensagem } from '../lib/tipos'
import { supabase } from '../lib/supabase'
import { OPCOES_LEMBRETE, type Evento } from '../lib/tipos'
import CartaoCalendario from '../components/CartaoCalendario'

const pad = (n: number) => String(n).padStart(2, '0')
const chaveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

type MensagemCurta = { id: string; titulo: string }
type Rascunho = {
  id?: string; titulo: string; local: string; data: string; hora: string
  mensagem_id: string; lembretes: number[]
}

function paraRascunho(e: Evento): Rascunho {
  const d = new Date(e.inicio)
  return {
    id: e.id, titulo: e.titulo, local: e.local ?? '', data: chaveDia(d),
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    mensagem_id: e.mensagem_id ?? '', lembretes: e.lembretes ?? [],
  }
}

const horaDe = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const iconeBotao = 'flex h-10 w-10 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto'

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-texto-2">{rotulo}</span>
      {children}
    </label>
  )
}

/* ── Formulário de compromisso ── */
function FormEvento({ inicial, mensagens, onSalvo, onExcluido, onFechar }: {
  inicial: Rascunho
  mensagens: MensagemCurta[]
  onSalvo: (e: Evento) => void
  onExcluido: (id: string) => void
  onFechar: () => void
}) {
  const [r, setR] = useState(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const mudar = (campos: Partial<Rascunho>) => setR((atual) => ({ ...atual, ...campos }))

  function alternarLembrete(minutos: number) {
    mudar({
      lembretes: r.lembretes.includes(minutos)
        ? r.lembretes.filter((m) => m !== minutos)
        : [...r.lembretes, minutos].sort((a, b) => b - a),
    })
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!r.titulo.trim()) { setErro('Dê um título ao compromisso.'); return }
    const inicio = new Date(`${r.data}T${r.hora}`)
    if (isNaN(inicio.getTime())) { setErro('Data ou horário inválido.'); return }
    setSalvando(true)
    setErro('')
    const dados = {
      titulo: r.titulo.trim(),
      local: r.local.trim() || null,
      inicio: inicio.toISOString(),
      mensagem_id: r.mensagem_id || null,
      lembretes: r.lembretes,
    }
    const { data, error } = r.id
      ? await supabase.from('eventos').update(dados).eq('id', r.id).select().single()
      : await supabase.from('eventos').insert(dados).select().single()
    setSalvando(false)
    if (error || !data) { setErro('Não foi possível salvar. Verifique a internet.'); return }
    onSalvo(data as Evento)
  }

  async function excluir() {
    if (!r.id || !confirm('Excluir este compromisso?')) return
    const { error } = await supabase.from('eventos').delete().eq('id', r.id)
    if (error) { setErro('Não foi possível excluir.'); return }
    onExcluido(r.id)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center" onClick={onFechar}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md space-y-5 overflow-y-auto rounded-t-3xl border border-borda bg-superficie p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{r.id ? 'Editar compromisso' : 'Novo compromisso'}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className={iconeBotao}><X size={20} /></button>
        </div>

        <Campo rotulo="Título">
          <input value={r.titulo} onChange={(e) => mudar({ titulo: e.target.value })} autoFocus
            placeholder="Culto de jovens" className="campo" />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Data">
            <input type="date" required value={r.data} onChange={(e) => mudar({ data: e.target.value })} className="campo" />
          </Campo>
          <Campo rotulo="Horário">
            <input type="time" required value={r.hora} onChange={(e) => mudar({ hora: e.target.value })} className="campo" />
          </Campo>
        </div>

        <Campo rotulo="Local">
          <div className="relative">
            <MapPin size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
            <input value={r.local} onChange={(e) => mudar({ local: e.target.value })}
              placeholder="Igreja Central" className="campo pl-10" />
          </div>
        </Campo>

        <Campo rotulo="Mensagem">
          <select value={r.mensagem_id} onChange={(e) => mudar({ mensagem_id: e.target.value })} className="campo">
            <option value="">Nenhuma</option>
            {mensagens.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}
          </select>
        </Campo>

        <div>
          <span className="mb-2 block text-sm font-semibold text-texto-2">Lembretes</span>
          <div className="flex flex-wrap gap-2">
            {OPCOES_LEMBRETE.map((o) => {
              const ativo = r.lembretes.includes(o.minutos)
              return (
                <button type="button" key={o.minutos} onClick={() => alternarLembrete(o.minutos)} aria-pressed={ativo}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${ativo
                    ? 'border-acao bg-acao/12 text-tinta'
                    : 'border-borda text-texto-2 hover:text-texto'}`}>
                  {o.rotulo}
                </button>
              )
            })}
          </div>
        </div>

        {erro && <p role="alert" className="text-sm text-perigo">{erro}</p>}

        <div className="flex items-center gap-2 pt-1">
          {r.id && (
            <button type="button" onClick={excluir} className="botao-fantasma px-3 hover:text-perigo">
              <Trash2 size={18} /> Excluir
            </button>
          )}
          <button disabled={salvando} className="botao-primario flex-1 px-6 py-3 sm:ml-auto sm:flex-none sm:py-2.5">
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── Item da lista ── */
function ItemEvento({ e, mensagens, mostrarData, onEditar }: {
  e: Evento; mensagens: MensagemCurta[]; mostrarData?: boolean; onEditar: () => void
}) {
  const msg = mensagens.find((m) => m.id === e.mensagem_id)
  const data = new Date(e.inicio).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
  return (
    <li className="flex gap-4 px-4 py-4">
      <div className="w-14 shrink-0">
        {mostrarData && <p className="text-xs text-texto-2 first-letter:uppercase">{data}</p>}
        <p className="font-bold tabular-nums">{horaDe(e.inicio)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <button onClick={onEditar} className="block w-full text-left">
          <p className="font-semibold">{e.titulo}</p>
          {e.local && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-texto-2"><MapPin size={14} /> {e.local}</p>
          )}
        </button>
        {msg && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-superficie-2 py-2 pl-3 pr-2">
            <Link to={`/mensagem/${msg.id}`} className="min-w-0 flex-1 truncate font-display font-bold hover:text-tinta">
              {msg.titulo}
            </Link>
            <Link to={`/pregar/${msg.id}`} className="botao-primario px-3 py-1.5 text-sm">
              <Play size={14} /> Pregar
            </Link>
          </div>
        )}
      </div>
    </li>
  )
}

/* ── Tela ── */
export default function Agenda() {
  const [hoje] = useState(() => new Date())
  const [mes, setMes] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  const [selecionado, setSelecionado] = useState(() => chaveDia(hoje))
  const [eventos, setEventos] = useState<Evento[] | null>(null)
  const [mensagens, setMensagens] = useState<MensagemCurta[]>([])
  const [form, setForm] = useState<Rascunho | null>(null)
  const [params, setParams] = useSearchParams()
  const [mensagemInicial] = useState(() => params.get('mensagem'))

  useEffect(() => {
    if (params.has('mensagem')) setParams({}, { replace: true })
  }, [params, setParams])
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('eventos').select('*').order('inicio'),
      supabase.from('mensagens').select('*').order('atualizado_em', { ascending: false }),
    ]).then(([ev, ms]) => {
      if (!ativo) return
      if (ev.error) setErro('Não foi possível carregar a agenda. Verifique a internet.')
      setEventos((ev.data as Evento[]) ?? [])
      const lista = ((ms.data ?? []) as (MensagemCurta & Pick<Mensagem, 'excluida_em' | 'detalhes'>)[]).filter(visivel)
      setMensagens(lista)
      // Vindo do editor: abre um compromisso novo já ligado à mensagem
      if (mensagemInicial && lista.some((x) => x.id === mensagemInicial))
        setForm({ titulo: '', local: '', data: chaveDia(new Date()), hora: '19:00', mensagem_id: mensagemInicial, lembretes: [1440, 60] })
    })
    return () => { ativo = false }
  }, [mensagemInicial])

  const porDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>()
    for (const e of eventos ?? []) {
      const k = chaveDia(new Date(e.inicio))
      mapa.set(k, [...(mapa.get(k) ?? []), e])
    }
    return mapa
  }, [eventos])

  const celulas = useMemo(() => {
    const inicio = new Date(mes)
    inicio.setDate(1 - mes.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio)
      d.setDate(inicio.getDate() + i)
      return d
    })
  }, [mes])

  const proximos = (eventos ?? []).filter((e) => new Date(e.inicio) >= hoje).slice(0, 5)
  const doDia = porDia.get(selecionado) ?? []
  const chaveHoje = chaveDia(hoje)
  const tituloDia = maiuscula(new Date(`${selecionado}T00:00`).toLocaleDateString('pt-BR',
    { weekday: 'long', day: 'numeric', month: 'long' }))

  function mudarMes(dir: -1 | 1) {
    setMes((m) => new Date(m.getFullYear(), m.getMonth() + dir, 1))
  }

  function irParaHoje() {
    setMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
    setSelecionado(chaveHoje)
  }

  function novo() {
    setForm({ titulo: '', local: '', data: selecionado, hora: '19:00', mensagem_id: '', lembretes: [1440, 60] })
  }

  function aoSalvar(ev: Evento) {
    setEventos((lista) =>
      [...(lista ?? []).filter((x) => x.id !== ev.id), ev].sort((a, b) => a.inicio.localeCompare(b.inicio)))
    const d = new Date(ev.inicio)
    setSelecionado(chaveDia(d))
    setMes(new Date(d.getFullYear(), d.getMonth(), 1))
    setForm(null)
  }

  function aoExcluir(id: string) {
    setEventos((lista) => (lista ?? []).filter((x) => x.id !== id))
    setForm(null)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-2 md:px-8 md:pt-10">
      <header className="flex items-center justify-between gap-3">
        <h1 className="titulo-pagina">Agenda</h1>
        <button onClick={novo} className="botao-primario"><Plus size={18} /> Novo</button>
      </header>

      {erro && <p role="alert" className="mt-4 text-sm text-perigo">{erro}</p>}

      <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* Calendário */}
      <section className="cartao mt-6 rounded-3xl p-4 lg:sticky lg:top-6">
        <div className="mb-3 flex items-center gap-1">
          <h2 className="flex-1 pl-1 font-display text-xl font-bold">
            {maiuscula(mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}
          </h2>
          <button onClick={irParaHoje} className="botao-fantasma px-3 py-1.5 text-sm">Hoje</button>
          <button onClick={() => mudarMes(-1)} aria-label="Mês anterior" className={iconeBotao}><ChevronLeft size={20} /></button>
          <button onClick={() => mudarMes(1)} aria-label="Próximo mês" className={iconeBotao}><ChevronRight size={20} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DIAS.map((d, i) => <span key={i} className="pb-1 text-xs font-semibold text-texto-2">{d}</span>)}
          {celulas.map((d) => {
            const k = chaveDia(d)
            const doMes = d.getMonth() === mes.getMonth()
            const eHoje = k === chaveHoje
            const sel = selecionado === k
            const qtd = porDia.get(k)?.length ?? 0
            return (
              <button key={k} onClick={() => setSelecionado(k)} aria-pressed={sel}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors
                  ${sel ? 'bg-acao font-bold text-acao-texto shadow-[0_6px_16px_-8px_var(--acao)]'
                    : eHoje ? 'font-bold text-tinta ring-2 ring-acao/50'
                      : doMes ? 'hover:bg-superficie-2' : 'text-texto-2/40 hover:bg-superficie-2'}`}>
                {d.getDate()}
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(qtd, 3) }, (_, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${sel ? 'bg-acao-texto' : 'bg-ouro'}`} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div>
      {/* Dia selecionado */}
      <section className="mt-8 lg:mt-6">
        <h2 className="font-display text-lg font-bold">{tituloDia}</h2>
        {eventos === null && <p className="mt-3 text-texto-2">Carregando…</p>}
        {eventos && doDia.length === 0 && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-borda px-4 py-4">
            <p className="text-texto-2">Nenhum compromisso neste dia.</p>
            <button onClick={novo} className="botao-fantasma px-3 py-1.5 text-sm"><Plus size={16} /> Marcar</button>
          </div>
        )}
        {doDia.length > 0 && (
          <ul className="cartao mt-3 divide-y divide-borda">
            {doDia.map((e) => (
              <ItemEvento key={e.id} e={e} mensagens={mensagens} onEditar={() => setForm(paraRascunho(e))} />
            ))}
          </ul>
        )}
      </section>

      {/* Próximos */}
      {proximos.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold">Próximos compromissos</h2>
          <ul className="cartao mt-3 divide-y divide-borda">
            {proximos.map((e) => (
              <ItemEvento key={e.id} e={e} mensagens={mensagens} mostrarData
                onEditar={() => setForm(paraRascunho(e))} />
            ))}
          </ul>
        </section>
      )}

      </div>
      </div>

      {/* Lembretes */}
      <section className="mt-10 space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold">Lembretes</h2>
          <p className="text-sm text-texto-2">Escolha como quer ser avisado dos seus compromissos.</p>
        </div>
        <CartaoCalendario />
      </section>

      {form && (
        <FormEvento inicial={form} mensagens={mensagens}
          onSalvo={aoSalvar} onExcluido={aoExcluir} onFechar={() => setForm(null)} />
      )}
    </div>
  )
}