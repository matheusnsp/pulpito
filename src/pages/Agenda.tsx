import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { OPCOES_LEMBRETE, type Evento } from '../lib/tipos'
import CartaoNotificacoes from '../components/CartaoNotificacoes'
import CartaoCalendario from '../components/CartaoCalendario'

const pad = (n: number) => String(n).padStart(2, '0')
const chaveDia = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const campo = 'w-full rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800 outline-none focus:ring-neutral-600'
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
    if (isNaN(inicio.getTime())) { setErro('Data ou hora inválida.'); return }
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
    if (error || !data) { setErro('Não foi possível salvar.'); return }
    onSalvo(data as Evento)
  }

  async function excluir() {
    if (!r.id || !confirm('Excluir este compromisso?')) return
    const { error } = await supabase.from('eventos').delete().eq('id', r.id)
    if (error) { setErro('Não foi possível excluir.'); return }
    onExcluido(r.id)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onFechar}>
      <form onSubmit={salvar} onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-neutral-950 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] ring-1 ring-neutral-800 sm:rounded-2xl">
        <h2 className="text-lg font-semibold">{r.id ? 'Editar compromisso' : 'Novo compromisso'}</h2>

        <input value={r.titulo} onChange={(e) => mudar({ titulo: e.target.value })} autoFocus
          placeholder="Ex: Culto de jovens" className={campo} />

        <div className="grid grid-cols-2 gap-2">
          <input type="date" required value={r.data} onChange={(e) => mudar({ data: e.target.value })} className={campo} />
          <input type="time" required value={r.hora} onChange={(e) => mudar({ hora: e.target.value })} className={campo} />
        </div>

        <input value={r.local} onChange={(e) => mudar({ local: e.target.value })}
          placeholder="Local (opcional)" className={campo} />

        <div>
          <label className="mb-1 block text-sm text-neutral-400">Mensagem</label>
          <select value={r.mensagem_id} onChange={(e) => mudar({ mensagem_id: e.target.value })} className={campo}>
            <option value="">Nenhuma</option>
            {mensagens.map((m) => <option key={m.id} value={m.id}>{m.titulo}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-neutral-400">Lembretes</label>
          <div className="flex flex-wrap gap-2">
            {OPCOES_LEMBRETE.map((o) => {
              const ativo = r.lembretes.includes(o.minutos)
              return (
                <button type="button" key={o.minutos} onClick={() => alternarLembrete(o.minutos)}
                  className={`rounded-full px-3 py-1.5 text-sm ring-1 ${ativo ? 'bg-sky-500/20 text-sky-300 ring-sky-500/40' : 'text-neutral-400 ring-neutral-700'}`}>
                  {o.rotulo}
                </button>
              )
            })}
          </div>
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <div className="flex gap-2">
          {r.id && (
            <button type="button" onClick={excluir} className="rounded-lg px-3 py-2.5 text-red-400 ring-1 ring-neutral-800">
              Excluir
            </button>
          )}
          <button type="button" onClick={onFechar} className="ml-auto rounded-lg px-4 py-2.5 ring-1 ring-neutral-700">
            Cancelar
          </button>
          <button disabled={salvando}
            className="rounded-lg bg-neutral-100 px-5 py-2.5 font-medium text-neutral-900 disabled:opacity-50">
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
  const data = new Date(e.inicio).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  return (
    <li className="rounded-xl p-3 ring-1 ring-neutral-800">
      <button onClick={onEditar} className="w-full text-left">
        <p className="text-sm text-neutral-400">
          {mostrarData && <span className="capitalize">{data} · </span>}{horaDe(e.inicio)}
          {e.local && <> · {e.local}</>}
        </p>
        <p className="font-medium">{e.titulo}</p>
      </button>
      {msg && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Link to={`/mensagem/${msg.id}`} className="min-w-0 flex-1 truncate text-sky-400">📝 {msg.titulo}</Link>
          <Link to={`/pregar/${msg.id}`} className="rounded-lg px-3 py-1 ring-1 ring-neutral-700">Pregar</Link>
        </div>
      )}
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
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('eventos').select('*').order('inicio'),
      supabase.from('mensagens').select('id, titulo').order('atualizado_em', { ascending: false }),
    ]).then(([ev, ms]) => {
      if (!ativo) return
      if (ev.error) setErro('Não foi possível carregar a agenda.')
      setEventos((ev.data as Evento[]) ?? [])
      setMensagens((ms.data as MensagemCurta[]) ?? [])
    })
    return () => { ativo = false }
  }, [])

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
  const tituloDia = maiuscula(new Date(`${selecionado}T00:00`).toLocaleDateString('pt-BR',
    { weekday: 'long', day: 'numeric', month: 'long' }))

  function mudarMes(dir: -1 | 1) {
    setMes((m) => new Date(m.getFullYear(), m.getMonth() + dir, 1))
  }

  function irParaHoje() {
    setMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
    setSelecionado(chaveDia(hoje))
  }

  function novo() {
    setForm({ titulo: '', local: '', data: selecionado, hora: '19:00', mensagem_id: '', lembretes: [1440, 60] })
  }

  function aoSalvar(ev: Evento) {
    setEventos((lista) =>
      [...(lista ?? []).filter((x) => x.id !== ev.id), ev].sort((a, b) => a.inicio.localeCompare(b.inicio)))
    setSelecionado(chaveDia(new Date(ev.inicio)))
    setForm(null)
  }

  function aoExcluir(id: string) {
    setEventos((lista) => (lista ?? []).filter((x) => x.id !== id))
    setForm(null)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      <CartaoNotificacoes />
      <CartaoCalendario />

      <section className="rounded-2xl p-3 ring-1 ring-neutral-800">
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => mudarMes(-1)} className="rounded-lg px-3 py-1.5 ring-1 ring-neutral-800">‹</button>
          <h2 className="flex-1 text-center text-lg font-semibold">
            {maiuscula(mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}
          </h2>
          <button onClick={irParaHoje} className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-neutral-800">Hoje</button>
          <button onClick={() => mudarMes(1)} className="rounded-lg px-3 py-1.5 ring-1 ring-neutral-800">›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DIAS.map((d, i) => <span key={i} className="py-1 text-xs text-neutral-500">{d}</span>)}
          {celulas.map((d) => {
            const k = chaveDia(d)
            const doMes = d.getMonth() === mes.getMonth()
            const eHoje = k === chaveDia(hoje)
            const qtd = porDia.get(k)?.length ?? 0
            return (
              <button key={k} onClick={() => setSelecionado(k)}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm
                  ${doMes ? '' : 'text-neutral-600'}
                  ${eHoje ? 'bg-neutral-800 font-semibold' : 'hover:bg-neutral-900'}
                  ${selecionado === k ? 'ring-2 ring-sky-500' : ''}`}>
                {d.getDate()}
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(qtd, 3) }, (_, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 text-lg font-semibold">{tituloDia}</h2>
          <button onClick={novo} className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900">+ Novo</button>
        </div>
        {eventos === null && <p className="text-neutral-500">Carregando…</p>}
        {eventos && doDia.length === 0 && <p className="text-neutral-500">Nenhum compromisso neste dia.</p>}
        <ul className="space-y-2">
          {doDia.map((e) => (
            <ItemEvento key={e.id} e={e} mensagens={mensagens} onEditar={() => setForm(paraRascunho(e))} />
          ))}
        </ul>
      </section>

      {proximos.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Próximos compromissos</h2>
          <ul className="space-y-2">
            {proximos.map((e) => (
              <ItemEvento key={e.id} e={e} mensagens={mensagens} mostrarData
                onEditar={() => setForm(paraRascunho(e))} />
            ))}
          </ul>
        </section>
      )}

      {form && (
        <FormEvento inicial={form} mensagens={mensagens}
          onSalvo={aoSalvar} onExcluido={aoExcluir} onFechar={() => setForm(null)} />
      )}
    </div>
  )
}