import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ClipboardCopy, GraduationCap, LoaderCircle, MessagesSquare, Plus, Search, Timer, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BLOCOS } from '../lib/blocos'
import { abrirCriar } from '../lib/criar'
import type { Mensagem, Topico } from '../lib/tipos'
import { visivel } from '../lib/lixeira'
import AvisoDeslizante from '../components/AvisoDeslizante'

/*
  Banco de perguntas: todas as perguntas e atividades dos estudos num lugar só.
  Perguntas iguais (mesmo texto) aparecem uma vez, com os estudos em que foram usadas.
  "Usar em…" copia o bloco para o fim de outro estudo.
*/

type Bloco = Pick<Topico, 'id' | 'mensagem_id' | 'titulo' | 'observacao' | 'notas' | 'tipo' | 'extra'>
type Estudo = { id: string; titulo: string }
type Item = { chave: string; bloco: Bloco; estudos: string[] }
type Filtro = 'todos' | 'pergunta' | 'atividade'

const normalizar = (s: string | null) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export default function Perguntas() {
  const [blocos, setBlocos] = useState<Bloco[] | null>(null)
  const [estudos, setEstudos] = useState<Estudo[]>([])
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [usando, setUsando] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ texto: string; estudo: string } | null>(null)

  useEffect(() => {
    let ativo = true
    Promise.all([
      supabase.from('topicos').select('id, mensagem_id, titulo, observacao, notas, tipo, extra').in('tipo', ['pergunta', 'atividade']),
      supabase.from('mensagens').select('*').order('atualizado_em', { ascending: false }),
    ]).then(([b, m]) => {
      if (!ativo) return
      if (b.error || m.error) setErro('Não foi possível carregar. Se ainda não rodou o SQL dos estudos no Supabase, rode e tente de novo.')
      setBlocos((b.data as Bloco[]) ?? [])
      setEstudos(((m.data ?? []) as (Estudo & Pick<Mensagem, 'excluida_em' | 'detalhes'>)[]).filter(visivel))
    })
    return () => { ativo = false }
  }, [])

  const nomeEstudo = (id: string) => estudos.find((e) => e.id === id)?.titulo || 'Sem título'

  // Agrupa perguntas iguais e guarda em quais estudos aparecem
  const itens = useMemo(() => {
    const mapa = new Map<string, Item>()
    for (const b of blocos ?? []) {
      if (!b.titulo?.trim()) continue
      const chave = `${b.tipo}:${normalizar(b.titulo)}`
      const it = mapa.get(chave)
      if (it) { if (!it.estudos.includes(b.mensagem_id)) it.estudos.push(b.mensagem_id) }
      else mapa.set(chave, { chave, bloco: b, estudos: [b.mensagem_id] })
    }
    return [...mapa.values()]
  }, [blocos])

  const termo = normalizar(busca)
  const visiveis = itens.filter((it) =>
    (filtro === 'todos' || it.bloco.tipo === filtro) &&
    (!termo || normalizar(it.bloco.titulo).includes(termo) || normalizar(it.bloco.observacao).includes(termo)))
  const qtd = (t: Filtro) => (t === 'todos' ? itens.length : itens.filter((i) => i.bloco.tipo === t).length)

  async function copiar(it: Item) {
    const texto = [it.bloco.titulo, it.bloco.observacao].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(it.chave)
      setTimeout(() => setCopiado(null), 1800)
    } catch { setErro('Não foi possível copiar.') }
  }

  async function usarEm(it: Item, estudoId: string) {
    setEnviando(true)
    setErro('')
    const { data: ult } = await supabase.from('topicos').select('ordem').eq('mensagem_id', estudoId).order('ordem', { ascending: false }).limit(1)
    const ordem = ((ult as { ordem: number }[] | null)?.[0]?.ordem ?? -1) + 1
    const { error } = await supabase.from('topicos').insert({
      mensagem_id: estudoId, ordem, tipo: it.bloco.tipo, titulo: it.bloco.titulo,
      observacao: it.bloco.observacao, notas: it.bloco.notas, extra: it.bloco.extra ?? {},
    })
    setEnviando(false)
    setUsando(null)
    if (error) { setErro('Não foi possível adicionar.'); return }
    setAviso({ texto: `Adicionada em “${nomeEstudo(estudoId)}”`, estudo: estudoId })
    setTimeout(() => setAviso(null), 4000)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-2 md:px-8 md:pt-10 lg:max-w-6xl">
      <h1 className="titulo-pagina">Banco de perguntas</h1>
      <p className="mt-1 text-texto-2">As perguntas e atividades de todos os seus estudos. Reuse numa aula nova com um toque.</p>

      <div className="relative mt-5 lg:max-w-xl">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-texto-2" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pergunta ou atividade"
          type="search" className="campo rounded-2xl py-3 pl-11 pr-11" />
        {busca && (
          <button onClick={() => setBusca('')} aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-texto-2 hover:bg-superficie-2"><X size={18} /></button>
        )}
      </div>

      <div className="sem-barra mt-3 flex gap-2 overflow-x-auto">
        {([['todos', 'Todas'], ['pergunta', 'Perguntas'], ['atividade', 'Atividades']] as const).map(([v, nome]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold ${filtro === v ? 'border-texto bg-texto text-fundo' : 'border-borda bg-superficie text-texto-2'}`}>
            {nome} <span className={`rounded-full px-1.5 text-xs ${filtro === v ? 'bg-fundo/20' : 'bg-superficie-2'}`}>{qtd(v)}</span>
          </button>
        ))}
      </div>

      {erro && <p role="alert" className="mt-4 rounded-xl bg-perigo/10 px-3 py-2 text-sm text-perigo">{erro}</p>}

      {blocos === null && (
        <ul className="mt-4 space-y-3" aria-label="Carregando">
          {[0, 1, 2].map((i) => <li key={i} className="cartao h-24 animate-pulse bg-superficie-2/60" />)}
        </ul>
      )}

      {blocos !== null && itens.length === 0 && !erro && (
        <div className="cartao mt-5 px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#38BDF8]/15 text-[#38BDF8]"><MessagesSquare size={24} /></span>
          <h2 className="mt-4 font-display text-xl font-extrabold">Nenhuma pergunta ainda</h2>
          <p className="mx-auto mt-2 max-w-sm text-texto-2">Quando você criar blocos de Pergunta ou Atividade nos estudos, eles aparecem aqui para reusar.</p>
          <button onClick={() => abrirCriar({ tipo: 'estudo' })} className="botao-primario mt-6"><Plus size={18} /> Novo estudo</button>
        </div>
      )}

      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {visiveis.map((it) => {
          const def = BLOCOS[it.bloco.tipo === 'atividade' ? 'atividade' : 'pergunta']
          return (
            <li key={it.chave} className="cartao flex flex-col p-4">
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${def.cor}26`, color: def.cor }}>
                  <def.Icone size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: def.cor }}>
                    {def.nome}
                    {it.bloco.extra?.minutos ? <span className="flex items-center gap-1 font-bold normal-case tracking-normal text-texto-2"><Timer size={11} /> {it.bloco.extra.minutos} min</span> : null}
                  </p>
                  <p className="mt-1 font-display text-[17px] font-bold leading-snug">{it.bloco.titulo}</p>
                  {it.bloco.observacao?.trim() && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-texto-2">{it.bloco.observacao}</p>}
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-2">
                    <GraduationCap size={13} />
                    {it.estudos.map((id, k) => (
                      <span key={id}>
                        <Link to={`/mensagem/${id}`} className="font-semibold text-texto hover:underline">{nomeEstudo(id)}</Link>{k < it.estudos.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex gap-2 border-t border-borda pt-3">
                <button onClick={() => copiar(it)} className="botao-secundario flex-1 py-2 text-sm">
                  {copiado === it.chave ? <><Check size={16} className="text-sucesso" /> Copiada</> : <><ClipboardCopy size={16} /> Copiar</>}
                </button>
                {usando === it.chave ? (
                  <select autoFocus defaultValue="" disabled={enviando} onBlur={() => !enviando && setUsando(null)}
                    onChange={(e) => e.target.value && usarEm(it, e.target.value)} className="campo flex-[1.4] py-2 text-sm">
                    <option value="" disabled>Escolha onde usar…</option>
                    {estudos.map((e) => <option key={e.id} value={e.id}>{e.titulo || 'Sem título'}</option>)}
                  </select>
                ) : (
                  <button onClick={() => setUsando(it.chave)} disabled={estudos.length === 0} className="botao-primario flex-[1.4] py-2 text-sm">
                    {enviando ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Usar
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {itens.length > 0 && visiveis.length === 0 && (
        <p className="py-10 text-center text-texto-2">Nada encontrado para “{busca}”.</p>
      )}

      {aviso && (
        <AvisoDeslizante key={aviso.texto} onDispensar={() => setAviso(null)}
          posicao="fixed inset-x-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md md:bottom-6"
          className="flex items-center gap-3 rounded-2xl bg-texto px-4 py-3 text-fundo shadow-xl">
          <Check size={18} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{aviso.texto}</span>
          <Link to={`/mensagem/${aviso.estudo}`} className="shrink-0 text-sm font-bold text-acao">Abrir</Link>
        </AvisoDeslizante>
      )}
    </div>
  )
}
