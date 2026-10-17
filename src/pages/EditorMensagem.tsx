import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CAMPOS_TOPICO, type Mensagem, type Topico } from '../lib/tipos'
import { parseReferencia, formatarReferencia, lerReferencia, type VersaoId } from '../lib/biblia'

type Status = 'salvo' | 'salvando' | 'erro'
type Salvar = () => PromiseLike<{ error: unknown }>
type Pendente = { timer: ReturnType<typeof setTimeout>; salvar: Salvar }

const campo = 'w-full rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800 outline-none focus:ring-neutral-600'

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
  if (!ref) return <p className="mt-1 text-xs text-amber-400/80">Referência não reconhecida (ex: Jo 3:16-18)</p>
  if (res?.chave !== chave) return <p className="mt-1 text-xs text-neutral-500">Buscando {formatarReferencia(ref)}…</p>
  if (!res.texto) return <p className="mt-1 text-xs text-amber-400/80">Versículo não encontrado.</p>
  return (
    <p className="mt-2 rounded-lg bg-neutral-900/60 p-2 text-sm leading-relaxed text-neutral-300">
      <span className="font-medium text-neutral-100">{formatarReferencia(ref)} ({versao})</span> — {res.texto}
    </p>
  )
}

export default function EditorMensagem() {
  const { id } = useParams()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [aberto, setAberto] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('salvo')
  const pendentes = useRef(new Map<string, Pendente>())

  /* Carrega a mensagem e os tópicos */
  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('mensagens').select('*').eq('id', id!).maybeSingle(),
      supabase.from('topicos').select('*').eq('mensagem_id', id!).order('ordem'),
    ]).then(([m, t]) => {
      if (!ativo) return
      setMensagem((m.data as Mensagem) ?? null)
      setTopicos((t.data as Topico[]) ?? [])
    })
    return () => { ativo = false }
  }, [id])

  /* Salvamento automático: espera a pessoa parar de digitar */
  const agendar = useCallback((chave: string, salvar: Salvar) => {
    const atual = pendentes.current.get(chave)
    if (atual) clearTimeout(atual.timer)
    setStatus('salvando')
    const timer = setTimeout(async () => {
      pendentes.current.delete(chave)
      const { error } = await salvar()
      if (error) setStatus('erro')
      else if (pendentes.current.size === 0) setStatus('salvo')
    }, 700)
    pendentes.current.set(chave, { timer, salvar })
  }, [])

  /* Ao sair da tela, salva o que ficou pendente; avisa se fechar a aba antes */
  useEffect(() => {
    const mapa = pendentes.current
    const aviso = (e: BeforeUnloadEvent) => { if (mapa.size) e.preventDefault() }
    window.addEventListener('beforeunload', aviso)
    return () => {
      window.removeEventListener('beforeunload', aviso)
      mapa.forEach((p) => { clearTimeout(p.timer); void Promise.resolve(p.salvar()) })
      mapa.clear()
    }
  }, [])

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
    const ordem = topicos.length ? Math.max(...topicos.map((t) => t.ordem)) + 1 : 0
    setStatus('salvando')
    const { data, error } = await supabase.from('topicos')
      .insert({ mensagem_id: id, ordem }).select().single()
    if (error || !data) { setStatus('erro'); return }
    setTopicos((lista) => [...lista, data as Topico])
    setAberto(data.id)
    setStatus(pendentes.current.size ? 'salvando' : 'salvo')
  }

  async function excluirTopico(t: Topico) {
    const temConteudo = [t.titulo, t.versiculo, ...CAMPOS_TOPICO.map((c) => t[c.chave])]
      .some((v) => v?.trim())
    if (temConteudo && !confirm('Excluir este tópico?')) return
    pendentes.current.forEach((p, k) => {
      if (k.startsWith(`t:${t.id}:`)) { clearTimeout(p.timer); pendentes.current.delete(k) }
    })
    setTopicos((lista) => lista.filter((x) => x.id !== t.id))
    const { error } = await supabase.from('topicos').delete().eq('id', t.id)
    if (error) setStatus('erro')
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

  if (mensagem === undefined) return <p className="p-6 text-neutral-500">Carregando…</p>
  if (mensagem === null) return (
    <div className="p-6">
      <p className="mb-2">Mensagem não encontrada.</p>
      <Link to="/" className="text-sky-400">Voltar para mensagens</Link>
    </div>
  )

  const textoStatus = { salvo: 'Salvo', salvando: 'Salvando…', erro: 'Erro ao salvar. Verifique a conexão.' }[status]

  return (
    <div className="mx-auto max-w-3xl p-4 pb-24">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="text-neutral-400 hover:text-neutral-200">← Mensagens</Link>
        <span className={`ml-auto text-sm ${status === 'erro' ? 'text-red-400' : 'text-neutral-500'}`}>
          {textoStatus}
        </span>
        <Link to={`/pregar/${mensagem.id}`}
          className="rounded-lg bg-neutral-100 px-4 py-2 font-medium text-neutral-900">
          Pregar
        </Link>
      </div>

      <input value={mensagem.titulo} onChange={(e) => alterarMensagem({ titulo: e.target.value })}
        placeholder="Título da mensagem"
        className="mb-3 w-full bg-transparent text-3xl font-semibold outline-none" />

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-sm text-neutral-400">Texto base</label>
          <input value={mensagem.texto_base ?? ''} placeholder="ex: Rm 8:28"
            onChange={(e) => alterarMensagem({ texto_base: e.target.value })} className={campo} />
          <PreviaVersiculo texto={mensagem.texto_base ?? ''} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-400">Tempo (min)</label>
          <input type="number" min={1} max={300} value={mensagem.tempo_minutos}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value))
              if (n >= 1 && n <= 300) alterarMensagem({ tempo_minutos: n })
            }}
            className={`${campo} sm:w-28`} />
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Tópicos</h2>

      {topicos.length === 0 && (
        <p className="mb-3 text-neutral-500">Nenhum tópico ainda. Cada tópico vira um ponto da pregação e um slide.</p>
      )}

      <div className="space-y-3">
        {topicos.map((t, i) => {
          const estaAberto = aberto === t.id
          return (
            <div key={t.id} className="rounded-xl ring-1 ring-neutral-800">
              <div className="flex items-center gap-2 p-3">
                <span className="w-6 text-center text-sm text-neutral-500">{i + 1}</span>
                <input value={t.titulo} placeholder="Título do tópico"
                  onChange={(e) => alterarTopico(t.id, { titulo: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-lg font-medium outline-none" />
                <button onClick={() => mover(i, -1)} disabled={i === 0}
                  className="px-2 text-neutral-400 disabled:opacity-20" title="Subir">↑</button>
                <button onClick={() => mover(i, 1)} disabled={i === topicos.length - 1}
                  className="px-2 text-neutral-400 disabled:opacity-20" title="Descer">↓</button>
                <button onClick={() => setAberto(estaAberto ? null : t.id)}
                  className="rounded-lg px-3 py-1 text-sm ring-1 ring-neutral-700 hover:bg-neutral-900">
                  {estaAberto ? 'Fechar' : 'Editar'}
                </button>
              </div>

              {!estaAberto && t.versiculo && (
                <p className="-mt-2 px-11 pb-3 text-sm text-neutral-500">{t.versiculo}</p>
              )}

              {estaAberto && (
                <div className="space-y-4 border-t border-neutral-800 p-3">
                  <div>
                    <label className="mb-1 block text-sm text-neutral-400">Versículo base</label>
                    <input value={t.versiculo ?? ''} placeholder="ex: Jo 3:16"
                      onChange={(e) => alterarTopico(t.id, { versiculo: e.target.value })} className={campo} />
                    <PreviaVersiculo texto={t.versiculo ?? ''} />
                  </div>

                  {CAMPOS_TOPICO.map((c) => (
                    <div key={c.chave}>
                      <label className="mb-1 block text-sm text-neutral-400">{c.rotulo}</label>
                      <textarea rows={c.chave === 'frase_chave' ? 2 : 3} placeholder={c.dica}
                        value={t[c.chave] ?? ''}
                        onChange={(e) => alterarTopico(t.id, { [c.chave]: e.target.value } as Partial<Topico>)}
                        className={`${campo} resize-y`} />
                    </div>
                  ))}

                  <button onClick={() => excluirTopico(t)} className="text-sm text-red-400 hover:text-red-300">
                    Excluir tópico
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={adicionarTopico}
        className="mt-3 w-full rounded-xl border border-dashed border-neutral-700 py-3 text-neutral-400 hover:bg-neutral-900">
        + Adicionar tópico
      </button>
    </div>
  )
}