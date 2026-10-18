import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen, Check, ChevronDown, ChevronLeft, ChevronUp, CircleAlert, Clock, LoaderCircle,
  Play, Plus, Presentation, Trash2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSalvamento } from '../lib/salvamento'
import { CAMPOS_TOPICO, type Mensagem, type Pasta, type Topico } from '../lib/tipos'
import { parseReferencia, formatarReferencia, lerReferencia, type VersaoId } from '../lib/biblia'

/* Mostra o texto do versículo enquanto a pessoa digita a referência */
function PreviaVersiculo({ texto }: { texto: string }) {
  const versao = (localStorage.getItem('pulpito-versao') as VersaoId) || 'ARA'
  const ref = parseReferencia(texto)
  const chave = ref ? `${versao}:${formatarReferencia(ref)}` : ''
  const [res, setRes] = useState<{ chave: string; texto: string } | null>(null)

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
  if (!ref) return <p className="mt-1.5 text-sm text-amber-600">Referência não reconhecida. Tente Jo 3:16-18.</p>
  if (res?.chave !== chave) return <p className="mt-1.5 text-sm text-texto-2">Buscando {formatarReferencia(ref)}…</p>
  if (!res.texto) return <p className="mt-1.5 text-sm text-amber-600">Versículo não encontrado.</p>
  return (
    <div className="mt-2 rounded-xl bg-superficie-2 px-3.5 py-3">
      <p className="text-sm font-semibold text-acao">
        {formatarReferencia(ref)} <span className="font-normal text-texto-2">{versao}</span>
      </p>
      <p className="mt-1 font-escritura leading-relaxed text-texto/90">{res.texto}</p>
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

const iconeBotao = 'flex h-9 w-9 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2 hover:text-texto disabled:opacity-25'

export default function EditorMensagem() {
  const { id } = useParams()
  const { status, agendar, cancelar } = useSalvamento()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [pastas, setPastas] = useState<Pasta[]>([])
  const [aberto, setAberto] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').eq('id', id!).maybeSingle(),
      supabase.from('topicos').select('*').eq('mensagem_id', id!).order('ordem'),
      supabase.from('pastas').select('id, nome').order('nome'),
    ]).then(([m, t, p]) => {
      if (!ativo) return
      setMensagem((m.data as Mensagem) ?? null)
      setTopicos((t.data as Topico[]) ?? [])
      setPastas((p.data as Pasta[]) ?? [])
    })
    return () => { ativo = false }
  }, [id])

  function alterarMensagem(campos: Partial<Mensagem>) {
    if (!mensagem) return
    setMensagem({ ...mensagem, ...campos })
    agendar(`m:${Object.keys(campos).join(',')}`, () =>
      supabase.from('mensagens').update(campos).eq('id', mensagem.id))
  }

  function alterarTopico(tid: string, campos: Partial<Topico>) {
    setTopicos((lista) => lista.map((t) => (t.id === tid ? { ...t, ...campos } : t)))
    agendar(`t:${tid}:${Object.keys(campos).join(',')}`, () =>
      supabase.from('topicos').update(campos).eq('id', tid))
  }

  async function adicionarTopico() {
    setErro('')
    const ordem = topicos.length ? Math.max(...topicos.map((t) => t.ordem)) + 1 : 0
    const { data, error } = await supabase.from('topicos')
      .insert({ mensagem_id: id, ordem }).select().single()
    if (error || !data) { setErro('Não foi possível criar o tópico. Verifique a internet.'); return }
    setTopicos((lista) => [...lista, data as Topico])
    setAberto(data.id)
  }

  async function excluirTopico(t: Topico) {
    const temConteudo = [t.titulo, t.versiculo, ...CAMPOS_TOPICO.map((c) => t[c.chave])]
      .some((v) => v?.trim())
    if (temConteudo && !confirm('Excluir este tópico?')) return
    cancelar(`t:${t.id}:`)
    setTopicos((lista) => lista.filter((x) => x.id !== t.id))
    const { error } = await supabase.from('topicos').delete().eq('id', t.id)
    if (error) setErro('Não foi possível excluir o tópico.')
  }

  function mover(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= topicos.length) return
    const lista = [...topicos]
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    const renumerada = lista.map((t, k) => ({ ...t, ordem: k }))
    setTopicos(renumerada)
    renumerada.forEach((t, k) => {
      if (topicos.find((o) => o.id === t.id)?.ordem !== k)
        agendar(`t:${t.id}:ordem`, () => supabase.from('topicos').update({ ordem: k }).eq('id', t.id))
    })
  }

  if (mensagem === undefined) return <p className="p-6 text-texto-2">Carregando…</p>
  if (mensagem === null) return (
    <div className="p-6">
      <p className="mb-3">Mensagem não encontrada.</p>
      <Link to="/" className="botao-secundario">Voltar para mensagens</Link>
    </div>
  )

  const indicador = {
    salvo: <><Check size={16} /> Salvo</>,
    salvando: <><LoaderCircle size={16} className="animate-spin" /> Salvando</>,
    erro: <><CircleAlert size={16} /> Não salvou. Verifique a internet.</>,
  }[status]

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pt-8">
      {/* Barra do topo */}
      <div className="flex items-center gap-2">
        <Link to="/" className="botao-fantasma -ml-2 px-2">
          <ChevronLeft size={20} /> Mensagens
        </Link>
        <span className={`ml-auto flex items-center gap-1.5 text-sm ${status === 'erro' ? 'text-perigo' : 'text-texto-2'}`}>
          {indicador}
        </span>
      </div>

      {/* Título */}
      <input value={mensagem.titulo} onChange={(e) => alterarMensagem({ titulo: e.target.value })}
        placeholder="Título da mensagem"
        className="mt-4 w-full bg-transparent font-escritura text-4xl font-semibold leading-tight outline-none placeholder:text-texto-2/50" />

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/pregar/${mensagem.id}`} className="botao-primario">
          <Play size={18} /> Pregar
        </Link>
        <Link to={`/mensagem/${mensagem.id}/slides`} className="botao-secundario">
          <Presentation size={18} /> Slides
        </Link>
      </div>

      {/* Dados da mensagem */}
      <div className="mt-8 grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_11rem]">
        <Campo rotulo="Texto base">
          <div className="relative">
            <BookOpen size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
            <input value={mensagem.texto_base ?? ''} placeholder="Rm 8:28"
              onChange={(e) => alterarMensagem({ texto_base: e.target.value })} className="campo pl-10" />
          </div>
          <PreviaVersiculo texto={mensagem.texto_base ?? ''} />
        </Campo>
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
      </div>

      {/* Tópicos */}
      <div className="mt-10 flex items-baseline justify-between">
        <h2 className="font-escritura text-2xl font-semibold">Tópicos</h2>
        {topicos.length > 0 && <span className="text-sm text-texto-2">{topicos.length}</span>}
      </div>

      {topicos.length === 0 && (
        <p className="mt-2 text-texto-2">Cada tópico vira um ponto da pregação e um slide no telão.</p>
      )}
      {erro && <p role="alert" className="mt-3 text-sm text-perigo">{erro}</p>}

      <ol className="mt-4 space-y-3">
        {topicos.map((t, i) => {
          const estaAberto = aberto === t.id
          return (
            <li key={t.id} className={`rounded-2xl border bg-superficie transition-colors ${estaAberto ? 'border-acao/40' : 'border-borda'}`}>
              <div className="flex items-center gap-3 p-3 pl-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acao/12 text-sm font-bold text-acao">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <input value={t.titulo} placeholder="Título do tópico"
                    onChange={(e) => alterarTopico(t.id, { titulo: e.target.value })}
                    onFocus={() => setAberto(t.id)}
                    className="w-full bg-transparent font-escritura text-xl font-semibold outline-none placeholder:text-texto-2/50" />
                  {!estaAberto && t.versiculo && <p className="truncate text-sm text-acao">{t.versiculo}</p>}
                </div>
                <div className="flex shrink-0 items-center">
                  <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir tópico" className={iconeBotao}>
                    <ChevronUp size={18} />
                  </button>
                  <button onClick={() => mover(i, 1)} disabled={i === topicos.length - 1} aria-label="Descer tópico" className={iconeBotao}>
                    <ChevronDown size={18} />
                  </button>
                  <button onClick={() => setAberto(estaAberto ? null : t.id)} aria-expanded={estaAberto}
                    className="ml-1 rounded-xl border border-borda px-3 py-1.5 text-sm font-semibold text-texto-2 hover:text-texto">
                    {estaAberto ? 'Fechar' : 'Editar'}
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
          )
        })}
      </ol>

      <button onClick={adicionarTopico}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-borda py-4 font-semibold text-texto-2 hover:border-acao hover:text-acao">
        <Plus size={18} /> Adicionar tópico
      </button>
    </div>
  )
}