import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { supabase } from '../lib/supabase'
import type { Mensagem, Pasta } from '../lib/tipos'

const CHAVE_FILTRO = 'pulpito-filtro-pasta'
type Filtro = 'todas' | 'sem' | string

const normalizar = (s: string | null) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const ordenar = (lista: Pasta[]) => [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

/* ── Aba de pasta: recebe mensagens arrastadas ── */
function ChipPasta({ valor, rotulo, qtd, ativo, soltavel, onClick }: {
  valor: Filtro; rotulo: string; qtd: number; ativo: boolean; soltavel: boolean; onClick: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `pasta:${valor}`, disabled: !soltavel })
  const estilo = isOver
    ? 'scale-105 bg-sky-500/25 text-sky-100 ring-2 ring-sky-400'
    : ativo
      ? 'bg-neutral-100 text-neutral-900 ring-1 ring-neutral-100'
      : 'text-neutral-300 ring-1 ring-neutral-800 hover:bg-neutral-900'
  return (
    <button ref={setNodeRef} onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${estilo}`}>
      {rotulo} <span className="opacity-50">{qtd}</span>
    </button>
  )
}

/* ── Item da lista: pode ser arrastado pela alça ⠿ ── */
function ItemMensagem({ m, pasta, pastas, onMover, onExcluir }: {
  m: Mensagem
  pasta: Pasta | null
  pastas: Pasta[]
  onMover: (destino: string) => void
  onExcluir: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: m.id })
  return (
    <li ref={setNodeRef}
      className={`flex items-center gap-2 rounded-xl p-3 ring-1 ring-neutral-800 hover:bg-neutral-900 ${isDragging ? 'opacity-30' : ''}`}>
      <button {...listeners} {...attributes} title="Arraste até uma pasta" aria-label="Arrastar para uma pasta"
        className="cursor-grab touch-none select-none px-1 text-lg text-neutral-600 hover:text-neutral-300 active:cursor-grabbing">
        ⠿
      </button>
      <Link to={`/mensagem/${m.id}`} className="min-w-0 flex-1">
        <p className="truncate font-medium">{m.titulo}</p>
        <p className="truncate text-sm text-neutral-500">
          {pasta && <span className="text-neutral-400">📁 {pasta.nome} · </span>}
          {m.texto_base ? `${m.texto_base} · ` : ''}
          {m.tempo_minutos} min · editada em{' '}
          {new Date(m.atualizado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </p>
      </Link>
      <select value="" onChange={(e) => onMover(e.target.value)} title="Mover para pasta"
        className="w-24 shrink-0 rounded-lg bg-neutral-950 px-2 py-1.5 text-sm text-neutral-400 ring-1 ring-neutral-700">
        <option value="" disabled>📁 Mover</option>
        <option value="sem">{!m.pasta_id ? '✓ ' : ''}Sem pasta</option>
        {pastas.map((p) => (
          <option key={p.id} value={p.id}>{m.pasta_id === p.id ? '✓ ' : ''}{p.nome}</option>
        ))}
      </select>
      <Link to={`/pregar/${m.id}`}
        className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-neutral-700 hover:bg-neutral-800">
        Pregar
      </Link>
      <button onClick={onExcluir}
        className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:text-red-400">
        Excluir
      </button>
    </li>
  )
}

export default function Mensagens() {
  const navigate = useNavigate()
  const [mensagens, setMensagens] = useState<Mensagem[] | null>(null)
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [filtro, setFiltro] = useState<Filtro>(() => localStorage.getItem(CHAVE_FILTRO) || 'todas')
  const [novaPasta, setNovaPasta] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)

  // Só começa a arrastar depois de mover 5px (evita arrastar sem querer)
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => { localStorage.setItem(CHAVE_FILTRO, filtro) }, [filtro])

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').order('atualizado_em', { ascending: false }),
      supabase.from('pastas').select('id, nome'),
    ]).then(([m, p]) => {
      if (!ativo) return
      if (m.error) setErro('Não foi possível carregar suas mensagens.')
      setMensagens((m.data as Mensagem[]) ?? [])
      setPastas(ordenar((p.data as Pasta[]) ?? []))
    })
    return () => { ativo = false }
  }, [])

  // Se a pasta lembrada não existe mais, volta para "Todas"
  const filtroValido = filtro === 'todas' || filtro === 'sem' || pastas.some((p) => p.id === filtro)
  const filtroAtivo = mensagens === null || filtroValido ? filtro : 'todas'
  const pastaAtual = pastas.find((p) => p.id === filtroAtivo) ?? null

  async function criar() {
    setCriando(true)
    const { data, error } = await supabase.from('mensagens')
      .insert({ pasta_id: pastaAtual?.id ?? null }).select().single()
    setCriando(false)
    if (error || !data) { setErro('Não foi possível criar a mensagem.'); return }
    navigate(`/mensagem/${data.id}`)
  }

  async function excluir(m: Mensagem) {
    if (!confirm(`Excluir "${m.titulo}"? Isso não pode ser desfeito.`)) return
    const { error } = await supabase.from('mensagens').delete().eq('id', m.id)
    if (error) { setErro('Não foi possível excluir.'); return }
    setMensagens((lista) => lista?.filter((x) => x.id !== m.id) ?? null)
  }

  async function moverPara(m: Mensagem, destino: string) {
    const pasta_id = destino === 'sem' ? null : destino
    if (pasta_id === m.pasta_id) return
    // Atualiza na tela na hora; se der erro, desfaz
    setMensagens((lista) => lista?.map((x) => (x.id === m.id ? { ...x, pasta_id } : x)) ?? null)
    const { error } = await supabase.from('mensagens').update({ pasta_id }).eq('id', m.id)
    if (error) {
      setErro('Não foi possível mover a mensagem.')
      setMensagens((lista) => lista?.map((x) => (x.id === m.id ? { ...x, pasta_id: m.pasta_id } : x)) ?? null)
    }
  }

  function aoComecar(e: DragStartEvent) {
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

  return (
    <DndContext sensors={sensores} onDragStart={aoComecar} onDragEnd={aoSoltar}
      onDragCancel={() => setArrastando(null)}>
      <div className="mx-auto max-w-3xl p-4 pt-0">
        <div className="mb-3 flex gap-2 pt-4">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar mensagem…"
            className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800 outline-none focus:ring-neutral-600" />
          <button onClick={criar} disabled={criando}
            className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900 disabled:opacity-50">
            {criando ? 'Criando…' : '+ Nova'}
          </button>
        </div>

        {/* Barra de pastas fixa no topo, para arrastar mesmo com a lista rolada */}
        <div className="sticky top-0 z-10 -mx-4 mb-3 bg-neutral-950/95 px-4 py-2 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <ChipPasta valor="todas" rotulo="Todas" qtd={todas.length} ativo={filtroAtivo === 'todas'}
              soltavel={false} onClick={() => setFiltro('todas')} />
            <ChipPasta valor="sem" rotulo="Sem pasta" qtd={todas.filter((m) => !m.pasta_id).length}
              ativo={filtroAtivo === 'sem'} soltavel onClick={() => setFiltro('sem')} />
            {pastas.map((p) => (
              <ChipPasta key={p.id} valor={p.id} rotulo={`📁 ${p.nome}`}
                qtd={todas.filter((m) => m.pasta_id === p.id).length}
                ativo={filtroAtivo === p.id} soltavel onClick={() => setFiltro(p.id)} />
            ))}
            {novaPasta === null ? (
              <button onClick={() => setNovaPasta('')}
                className="shrink-0 rounded-full border border-dashed border-neutral-700 px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-900">
                + Pasta
              </button>
            ) : (
              <form onSubmit={criarPasta} className="flex shrink-0 items-center gap-1">
                <input autoFocus value={novaPasta} placeholder="Nome da pasta"
                  onChange={(e) => setNovaPasta(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setNovaPasta(null) }}
                  className="w-40 rounded-full bg-neutral-900 px-3 py-1.5 text-sm ring-1 ring-neutral-600 outline-none" />
                <button className="rounded-full px-2.5 py-1.5 text-sm text-emerald-400">✓</button>
                <button type="button" onClick={() => setNovaPasta(null)}
                  className="rounded-full px-2 py-1.5 text-sm text-neutral-500">✕</button>
              </form>
            )}
          </div>
          {pastas.length > 0 && todas.length > 0 && (
            <p className="mt-1 text-xs text-neutral-600">Segure ⠿ e arraste uma mensagem até uma pasta.</p>
          )}
        </div>

        {pastaAtual && (
          <div className="mb-3 flex gap-4 text-sm">
            <button onClick={() => renomearPasta(pastaAtual)} className="text-neutral-400 hover:text-neutral-200">
              Renomear pasta
            </button>
            <button onClick={() => excluirPasta(pastaAtual)} className="text-neutral-500 hover:text-red-400">
              Excluir pasta
            </button>
          </div>
        )}

        {erro && <p className="mb-3 text-sm text-red-400">{erro}</p>}
        {mensagens === null && !erro && <p className="text-neutral-500">Carregando…</p>}

        {mensagens?.length === 0 && (
          <div className="rounded-xl p-8 text-center ring-1 ring-neutral-800">
            <p className="mb-1 text-lg">Nenhuma mensagem ainda.</p>
            <p className="text-neutral-500">Toque em "+ Nova" para começar a primeira.</p>
          </div>
        )}

        <ul className="space-y-2">
          {filtradas.map((m) => (
            <ItemMensagem key={m.id} m={m} pastas={pastas}
              pasta={filtroAtivo === 'todas' ? pastas.find((p) => p.id === m.pasta_id) ?? null : null}
              onMover={(destino) => moverPara(m, destino)}
              onExcluir={() => excluir(m)} />
          ))}
        </ul>

        {mensagens && mensagens.length > 0 && filtradas.length === 0 && (
          <p className="text-neutral-500">
            {termo ? `Nenhuma mensagem encontrada para "${busca}".` : 'Nenhuma mensagem nesta pasta.'}
          </p>
        )}
      </div>

      {/* Cartão que acompanha o dedo/mouse durante o arraste */}
      <DragOverlay>
        {mensagemArrastada && (
          <div className="max-w-xs rounded-xl bg-neutral-900 px-4 py-3 shadow-2xl ring-2 ring-sky-400">
            <p className="truncate font-medium">{mensagemArrastada.titulo}</p>
            <p className="text-xs text-neutral-400">Solte numa pasta</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}