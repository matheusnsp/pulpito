import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Mensagem, Topico } from '../lib/tipos'
import {
  parseReferencia, formatarReferencia, lerCapitulo, nomeDoLivro, type VersaoId,
} from '../lib/biblia'

const TAMANHOS = [
  { titulo: 'text-2xl', corpo: 'text-base' },
  { titulo: 'text-3xl', corpo: 'text-lg' },
  { titulo: 'text-4xl', corpo: 'text-xl' },
  { titulo: 'text-5xl', corpo: 'text-2xl' },
  { titulo: 'text-6xl', corpo: 'text-3xl' },
]
const CHAVE_ESCALA = 'pulpito-escala-pregacao'

function fmt(ms: number) {
  const s = Math.floor(Math.abs(ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const versaoAtual = () => (localStorage.getItem('pulpito-versao') as VersaoId) || 'ARA'

/* ── Bíblia por cima da tela ── */
function BibliaSobreposta({ inicial, onFechar }: { inicial: string; onFechar: () => void }) {
  const versao = versaoAtual()
  const [consulta, setConsulta] = useState(inicial)
  const [atual, setAtual] = useState(inicial)
  const [erro, setErro] = useState('')
  const [res, setRes] = useState<{ chave: string; versos: string[] } | null>(null)

  const ref = parseReferencia(atual)
  const chave = ref ? `${versao}:${ref.livro}.${ref.capitulo}` : ''
  const inicio = ref?.inicio
  const fim = ref?.fim ?? ref?.inicio
  const carregado = !!ref && res?.chave === chave
  const versos = carregado ? res?.versos ?? [] : []

  useEffect(() => {
    const r = parseReferencia(atual)
    if (!r) return
    let ativo = true
    const k = `${versao}:${r.livro}.${r.capitulo}`
    lerCapitulo(versao, r.livro, r.capitulo)
      .then((v) => { if (ativo) setRes({ chave: k, versos: v }) })
      .catch(() => { if (ativo) setRes({ chave: k, versos: [] }) })
    return () => { ativo = false }
  }, [atual, versao])

  useEffect(() => {
    if (carregado && inicio)
      document.getElementById(`sv-${inicio}`)?.scrollIntoView({ block: 'center' })
  }, [carregado, inicio])

  function buscar(e: FormEvent) {
    e.preventDefault()
    if (!parseReferencia(consulta)) { setErro('Referência não reconhecida. Ex: Sl 23 ou Jo 3:16'); return }
    setErro('')
    setAtual(consulta)
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/60" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-neutral-950 ring-1 ring-neutral-800">
        <form onSubmit={buscar} className="flex gap-2 border-b border-neutral-800 p-3">
          <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder='ex: "Sl 23"'
            className="min-w-0 flex-1 rounded-lg bg-neutral-900 px-3 py-2 ring-1 ring-neutral-800 outline-none" />
          <button className="rounded-lg px-3 py-2 ring-1 ring-neutral-700">Ir</button>
          <button type="button" onClick={onFechar}
            className="rounded-lg bg-neutral-100 px-3 py-2 font-medium text-neutral-900">Fechar</button>
        </form>
        <div className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {erro && <p className="mb-2 text-sm text-red-400">{erro}</p>}
          {!ref && <p className="text-neutral-500">Digite uma referência para abrir.</p>}
          {ref && !carregado && <p className="text-neutral-500">Carregando…</p>}
          {ref && carregado && (
            <>
              <h3 className="mb-3 text-lg font-semibold">
                {nomeDoLivro(ref.livro)} {ref.capitulo}{' '}
                <span className="text-sm font-normal text-neutral-500">{versao}</span>
              </h3>
              {versos.length === 0 && <p className="text-neutral-500">Capítulo não encontrado.</p>}
              {versos.map((texto, i) => {
                const n = i + 1
                const destaque = !!inicio && n >= inicio && n <= (fim ?? inicio)
                return (
                  <p key={n} id={`sv-${n}`}
                    className={`rounded-md px-2 py-1 text-lg leading-relaxed ${destaque ? 'bg-sky-500/15 text-neutral-50' : 'text-neutral-400'}`}>
                    <sup className="mr-1 text-xs text-neutral-500">{n}</sup>{texto}
                  </p>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ChipVersiculo({ texto, classe, onAbrir }: { texto: string; classe: string; onAbrir: () => void }) {
  const ref = parseReferencia(texto)
  if (!ref) return <p className={`${classe} text-neutral-400`}>{texto}</p>
  return (
    <button onClick={onAbrir}
      className={`${classe} inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-4 py-2 text-sky-300 ring-1 ring-sky-500/30`}>
      📖 {formatarReferencia(ref)}
    </button>
  )
}

/* ── Tela principal ── */
export default function Pregar() {
  const { id } = useParams()
  const [mensagem, setMensagem] = useState<Mensagem | null | undefined>(undefined)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [indice, setIndice] = useState(0)
  const [biblia, setBiblia] = useState<string | null>(null)
  const [escala, setEscala] = useState(() => {
    const salvo = localStorage.getItem(CHAVE_ESCALA)
    return salvo !== null && TAMANHOS[Number(salvo)] ? Number(salvo) : 2
  })

  // Cronômetro
  const [rodando, setRodando] = useState(false)
  const [acumulado, setAcumulado] = useState(0)
  const [iniciadoEm, setIniciadoEm] = useState<number | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const toqueX = useRef<number | null>(null)

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

  useEffect(() => { localStorage.setItem(CHAVE_ESCALA, String(escala)) }, [escala])

  useEffect(() => {
    if (!rodando) return
    const intervalo = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(intervalo)
  }, [rodando])

  // Mantém a tela acesa
  useEffect(() => {
    let trava: WakeLockSentinel | null = null
    let cancelado = false
    async function pedir() {
      try {
        if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
        const t = await navigator.wakeLock.request('screen')
        if (cancelado) t.release()
        else trava = t
      } catch { /* navegador sem suporte ou sem HTTPS */ }
    }
    pedir()
    const aoVoltar = () => { if (document.visibilityState === 'visible') pedir() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', aoVoltar)
      trava?.release()
    }
  }, [])

  // Teclado e passador de slides
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (biblia !== null) { if (e.key === 'Escape') setBiblia(null); return }
      if (['ArrowRight', 'PageDown'].includes(e.key)) setIndice((i) => Math.min(i + 1, topicos.length))
      if (['ArrowLeft', 'PageUp'].includes(e.key)) setIndice((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [biblia, topicos.length])

  function ir(dir: -1 | 1) {
    setIndice((i) => Math.min(Math.max(i + dir, 0), topicos.length))
  }

  function alternarCronometro() {
    const t = Date.now()
    if (rodando) {
      setAcumulado((a) => a + t - (iniciadoEm ?? t))
      setRodando(false)
    } else {
      setIniciadoEm(t)
      setAgora(t)
      setRodando(true)
    }
  }

  function zerar() {
    setRodando(false)
    setAcumulado(0)
    setIniciadoEm(null)
  }

  if (mensagem === undefined) return <p className="p-6 text-neutral-500">Carregando…</p>
  if (mensagem === null) return (
    <div className="p-6">
      <p className="mb-2">Mensagem não encontrada.</p>
      <Link to="/" className="text-sky-400">Voltar</Link>
    </div>
  )

  const total = mensagem.tempo_minutos * 60_000
  const decorrido = acumulado + (rodando && iniciadoEm !== null ? agora - iniciadoEm : 0)
  const restante = total - decorrido
  const fracao = decorrido / total
  const cor = decorrido === 0 ? 'text-neutral-100'
    : fracao >= 0.8 ? 'text-red-500' : fracao >= 0.5 ? 'text-amber-400' : 'text-emerald-400'
  const barra = fracao >= 0.8 ? 'bg-red-500' : fracao >= 0.5 ? 'bg-amber-400' : 'bg-emerald-500'
  const tam = TAMANHOS[escala]
  const topico = indice > 0 ? topicos[indice - 1] : null

  const secoes = topico ? ([
    ['Observação', topico.observacao],
    ['Aplicação', topico.aplicacao],
    ['Ilustração', topico.ilustracao],
    ['Notas', topico.notas],
  ] as const).filter(([, v]) => v?.trim()) : []

  const botaoTopo = 'rounded-lg px-2.5 py-1.5 text-sm ring-1 ring-neutral-800 hover:bg-neutral-900 disabled:opacity-30'

  return (
    <div className="flex h-dvh flex-col bg-neutral-950">
      {fracao >= 1 && (
        <div className="pointer-events-none fixed inset-0 z-30 animate-pulse border-8 border-red-600" />
      )}

      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <div className="flex items-center gap-1">
          <Link to={`/mensagem/${mensagem.id}`} className="px-2 py-1 text-xl text-neutral-400" title="Sair">✕</Link>
          {!rodando && decorrido > 0 && <button onClick={zerar} className={botaoTopo}>Zerar</button>}
        </div>

        <button onClick={alternarCronometro} className="flex flex-col items-center leading-none">
          <span className={`font-mono text-4xl font-semibold tabular-nums ${cor}`}>
            {restante >= 0 ? fmt(restante) : `+${fmt(restante)}`}
          </span>
          <span className="mt-1 text-xs text-neutral-500">
            {rodando ? 'toque para pausar' : decorrido ? 'pausado' : 'toque para iniciar'}
          </span>
        </button>

        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setEscala((e) => e - 1)} disabled={escala === 0} className={botaoTopo}>A−</button>
          <button onClick={() => setEscala((e) => e + 1)} disabled={escala === TAMANHOS.length - 1} className={botaoTopo}>A+</button>
          <button onClick={() => setBiblia(topico?.versiculo || mensagem.texto_base || '')} className={botaoTopo}>Bíblia</button>
        </div>
      </header>

      <div className="h-1 bg-neutral-900">
        <div className={`h-full ${barra} transition-all`} style={{ width: `${Math.min(fracao, 1) * 100}%` }} />
      </div>

      <main className="flex-1 overflow-y-auto"
        onTouchStart={(e) => { toqueX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (toqueX.current === null) return
          const dx = e.changedTouches[0].clientX - toqueX.current
          toqueX.current = null
          if (Math.abs(dx) > 70) ir(dx < 0 ? 1 : -1)
        }}>
        <div className="mx-auto max-w-3xl space-y-6 p-5">
          {!topico && (
            <div className="space-y-4 pt-8">
              <h1 className={`${tam.titulo} font-semibold leading-tight`}>{mensagem.titulo}</h1>
              {mensagem.texto_base && (
                <ChipVersiculo texto={mensagem.texto_base} classe={tam.corpo}
                  onAbrir={() => setBiblia(mensagem.texto_base)} />
              )}
              <p className="text-neutral-500">
                {topicos.length} {topicos.length === 1 ? 'tópico' : 'tópicos'} · {mensagem.tempo_minutos} min
              </p>
            </div>
          )}

          {topico && (
            <>
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-widest text-neutral-500">
                  Tópico {indice} de {topicos.length}
                </p>
                <h1 className={`${tam.titulo} font-semibold leading-tight`}>
                  {topico.titulo || 'Sem título'}
                </h1>
                {topico.versiculo && (
                  <ChipVersiculo texto={topico.versiculo} classe={tam.corpo}
                    onAbrir={() => setBiblia(topico.versiculo)} />
                )}
              </div>

              {topico.frase_chave?.trim() && (
                <p className={`${tam.corpo} whitespace-pre-wrap rounded-xl border-l-4 border-amber-400 bg-amber-400/10 p-4 font-medium leading-relaxed`}>
                  {topico.frase_chave}
                </p>
              )}

              {secoes.map(([rotulo, valor]) => (
                <section key={rotulo}>
                  <h2 className="mb-1 text-xs uppercase tracking-widest text-neutral-500">{rotulo}</h2>
                  <p className={`${tam.corpo} whitespace-pre-wrap leading-relaxed ${rotulo === 'Notas' ? 'text-neutral-400' : ''}`}>
                    {valor}
                  </p>
                </section>
              ))}
            </>
          )}
        </div>
      </main>

      <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-neutral-800 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button onClick={() => ir(-1)} disabled={indice === 0}
          className="rounded-xl py-4 text-lg ring-1 ring-neutral-800 disabled:opacity-30">← Anterior</button>
        <span className="px-3 tabular-nums text-neutral-500">
          {indice === 0 ? 'Início' : `${indice} / ${topicos.length}`}
        </span>
        <button onClick={() => ir(1)} disabled={indice === topicos.length}
          className="rounded-xl bg-neutral-100 py-4 text-lg font-medium text-neutral-900 disabled:opacity-30">Próximo →</button>
      </footer>

      {biblia !== null && <BibliaSobreposta inicial={biblia} onFechar={() => setBiblia(null)} />}
    </div>
  )
}